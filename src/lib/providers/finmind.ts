import { subDays } from "date-fns";
import { z } from "zod";
import type { MarketDataProvider } from "@/lib/providers/contracts";
import { MockMarketDataProvider } from "@/lib/providers/mock-market";
import { taipeiDate } from "@/lib/reports/calendar";
import type { StockSnapshot } from "@/types/domain";

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

export class FinMindMarketDataProvider implements MarketDataProvider {
  readonly mode = process.env.FINMIND_API_TOKEN ? "live" : "mock";

  constructor(
    private readonly fallback: MarketDataProvider = new MockMarketDataProvider(),
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  getGlobalMarkets() {
    return this.fallback.getGlobalMarkets();
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    const mockStocks = await this.fallback.getCoreStocks();
    const token = process.env.FINMIND_API_TOKEN;
    if (!token)
      return mockStocks.map((stock) =>
        stock.market === "TW"
          ? this.markFallback(
              stock,
              "未設定 FINMIND_API_TOKEN，已使用 Mock Data。",
            )
          : stock,
      );

    return Promise.all(
      mockStocks.map(async (stock) => {
        if (stock.market !== "TW") return stock;
        try {
          return await this.fetchTaiwanStock(stock, token);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "未知錯誤";
          return this.markFallback(
            stock,
            `FinMind 取得失敗，已使用 Mock Data：${reason}`,
          );
        }
      }),
    );
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
}
