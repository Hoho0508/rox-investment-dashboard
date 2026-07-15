import { subDays } from "date-fns";
import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { FugleRealtimeTaiwanProvider } from "@/lib/market/fugle";
import type { MarketDataProvider } from "@/lib/providers/contracts";
import { MockMarketDataProvider } from "@/lib/providers/mock-market";
import { taipeiDate } from "@/lib/reports/calendar";
import type { DataMode, StockSnapshot } from "@/types/domain";
import type { LiveQuote } from "@/types/market";

const FINMIND_DATA_URL = "https://api.finmindtrade.com/api/v4/data";

const finMindResponseSchema = z.object({
  status: z.number(),
  msg: z.string().optional(),
  data: z.array(
    z.object({
      date: z.string(),
      stock_id: z.string(),
      close: z.coerce.number(),
      spread: z.coerce.number(),
    }),
  ),
});

type RealtimeQuoteProvider = Pick<RealtimeTaiwanMarketProvider, "getQuotes">;
type StockFetchResult =
  | { kind: "success"; stock: StockSnapshot }
  | { kind: "failure"; template: StockSnapshot; reason: string };

export class FinMindMarketDataProvider implements MarketDataProvider {
  readonly mode =
    process.env.FINMIND_API_TOKEN || process.env.FUGLE_MARKETDATA_API_KEY
      ? ("live" as const)
      : process.env.DATA_MODE === "live"
        ? ("unavailable" as const)
        : ("mock" as const);

  constructor(
    private readonly fallback: MarketDataProvider = new MockMarketDataProvider(),
    private readonly fetcher: typeof fetch = fetch,
    private readonly injectedRealtimeProvider?: RealtimeQuoteProvider,
  ) {}

  async getGlobalMarkets() {
    return process.env.DATA_MODE === "live"
      ? []
      : this.fallback.getGlobalMarkets();
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    const templates = await this.fallback.getCoreStocks();
    const token = process.env.FINMIND_API_TOKEN;
    const realtimeProvider = this.resolveRealtimeProvider();

    if (!token) {
      const realtimeStocks = await this.fetchRealtimeStocks(
        templates.filter((stock) => stock.market === "TW"),
        realtimeProvider,
      );
      return templates.map((stock) => {
        if (stock.market !== "TW")
          return process.env.DATA_MODE === "live"
            ? this.markUnavailable(
                stock,
                "美股正式行情 Provider 尚未串接，未顯示替代數值。",
              )
            : stock;
        const realtime = realtimeStocks.get(stock.symbol);
        if (realtime) return realtime;
        return process.env.DATA_MODE === "live"
          ? this.markUnavailable(
              stock,
              realtimeProvider
                ? "未設定 FINMIND_API_TOKEN，且 Fugle 暫時無可用報價；未顯示替代數值。"
                : "未設定 FINMIND_API_TOKEN 或 FUGLE_MARKETDATA_API_KEY，未顯示替代數值。",
            )
          : this.markFallback(
              stock,
              "未設定 FINMIND_API_TOKEN，已使用 Mock Data。",
            );
      });
    }

    const results: StockFetchResult[] = await Promise.all(
      templates.map(async (stock): Promise<StockFetchResult> => {
        if (stock.market !== "TW")
          return {
            kind: "success",
            stock:
              process.env.DATA_MODE === "live"
                ? this.markUnavailable(
                    stock,
                    "美股正式行情 Provider 尚未串接，未顯示替代數值。",
                  )
                : stock,
          };
        try {
          return {
            kind: "success",
            stock: await this.fetchTaiwanStock(stock, token),
          };
        } catch (error) {
          const reason = error instanceof Error ? error.message : "未知錯誤";
          return { kind: "failure", template: stock, reason };
        }
      }),
    );
    const realtimeStocks = await this.fetchRealtimeStocks(
      results.flatMap((result) =>
        result.kind === "failure" ? [result.template] : [],
      ),
      realtimeProvider,
    );
    return results.map((result) => {
      if (result.kind === "success") return result.stock;
      const realtime = realtimeStocks.get(result.template.symbol);
      if (realtime) return realtime;
      return process.env.DATA_MODE === "live"
        ? this.markUnavailable(
            result.template,
            `FinMind 取得失敗，且 Fugle 無可用報價；未顯示替代數值：${result.reason}`,
          )
        : this.markFallback(
            result.template,
            `FinMind 取得失敗，已使用 Mock Data：${result.reason}`,
          );
    });
  }

  private resolveRealtimeProvider(): RealtimeQuoteProvider | undefined {
    if (this.injectedRealtimeProvider) return this.injectedRealtimeProvider;
    const apiKey = process.env.FUGLE_MARKETDATA_API_KEY;
    return apiKey ? new FugleRealtimeTaiwanProvider(apiKey) : undefined;
  }

  private async fetchRealtimeStocks(
    templates: StockSnapshot[],
    provider: RealtimeQuoteProvider | undefined,
  ) {
    const stocks = new Map<string, StockSnapshot>();
    if (!provider || templates.length === 0) return stocks;
    try {
      const quotes = await provider.getQuotes(
        templates.map((stock) => stock.symbol),
      );
      const templateBySymbol = new Map(
        templates.map((stock) => [stock.symbol, stock]),
      );
      for (const quote of quotes) {
        const template = templateBySymbol.get(quote.symbol);
        if (template && quote.dataMode === "live" && quote.price !== null)
          stocks.set(quote.symbol, this.fromRealtimeQuote(template, quote));
      }
    } catch {
      // 呼叫端會以 unavailable 或清楚標示的 Mock fallback 收尾。
    }
    return stocks;
  }

  private fromRealtimeQuote(
    template: StockSnapshot,
    quote: LiveQuote,
  ): StockSnapshot {
    const priceMode: DataMode = quote.dataMode;
    return {
      ...template,
      name: quote.name || template.name,
      price: {
        value: quote.price,
        sourceName: quote.sourceName,
        sourceUrl: quote.sourceUrl,
        fetchedAt: quote.asOf,
        marketDate: quote.asOf.slice(0, 10),
        isDelayed: quote.isDelayed,
        dataMode: priceMode,
        confidence: quote.isDelayed ? 86 : 94,
      },
      dayChangePercent: quote.changePercent,
      // Fugle 行情不包含基本面；不得沿用 Mock 基本面。
      revenueGrowth: null,
      epsGrowth: null,
      grossMarginTrend: null,
      freeCashFlowTrend: null,
      forwardPe: null,
      outlook: "未知",
      thesisIntact: null,
      majorRisk: `${template.majorRisk}；Fugle 僅提供行情，基本面資料尚未串接`,
    };
  }

  private async fetchTaiwanStock(
    template: StockSnapshot,
    token: string,
  ): Promise<StockSnapshot> {
    const endDate = taipeiDate();
    const startDate = taipeiDate(subDays(new Date(), 14));
    const query = new URLSearchParams({
      dataset: "TaiwanStockPrice",
      data_id: template.symbol,
      start_date: startDate,
      end_date: endDate,
    });
    const response = await this.fetcher(`${FINMIND_DATA_URL}?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = finMindResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.status !== 200)
      throw new Error(
        parsed.success
          ? (parsed.data.msg ?? `API status ${parsed.data.status}`)
          : "回傳格式不正確",
      );
    const latest = parsed.data.data
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    if (!latest) throw new Error("查無最近交易資料");
    const previousClose = latest.close - latest.spread;
    const dayChangePercent =
      previousClose === 0 ? 0 : (latest.spread / previousClose) * 100;
    return {
      ...template,
      price: {
        value: latest.close,
        sourceName: "FinMind / TaiwanStockPrice",
        sourceUrl: FINMIND_DATA_URL,
        fetchedAt: new Date().toISOString(),
        marketDate: latest.date,
        isDelayed: true,
        dataMode: "live",
        confidence: 88,
      },
      dayChangePercent,
      // 價格 API 不包含基本面；不得沿用 Mock 基本面冒充真實資料。
      revenueGrowth: null,
      epsGrowth: null,
      grossMarginTrend: null,
      freeCashFlowTrend: null,
      forwardPe: null,
      outlook: "未知",
      thesisIntact: null,
      majorRisk: `${template.majorRisk}；基本面資料尚未串接 FinMind 對應資料集`,
    };
  }

  private markFallback(stock: StockSnapshot, error: string): StockSnapshot {
    return {
      ...stock,
      price: {
        ...stock.price,
        sourceName: "Rox Mock Dataset（FinMind fallback）",
        dataMode: "mock",
        isDelayed: true,
        confidence: 45,
        error,
      },
    };
  }

  private markUnavailable(stock: StockSnapshot, error: string): StockSnapshot {
    return {
      ...stock,
      price: {
        value: null,
        sourceName: "尚無可用正式資料",
        fetchedAt: new Date().toISOString(),
        isDelayed: true,
        dataMode: "unavailable",
        confidence: 0,
        error,
      },
      dayChangePercent: null,
      revenueGrowth: null,
      epsGrowth: null,
      grossMarginTrend: null,
      freeCashFlowTrend: null,
      forwardPe: null,
      outlook: "未知",
      thesisIntact: null,
      majorRisk: error,
    };
  }
}
