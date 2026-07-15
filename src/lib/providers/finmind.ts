import { subDays } from "date-fns";
import { z } from "zod";
import {
  CORE_STOCKS,
  type CoreStockIdentity,
} from "@/lib/providers/core-stocks";
import { unavailableEnvelope } from "@/lib/providers/envelopes";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import type { MarketDataProvider } from "@/lib/providers/contracts";
import { taipeiDate } from "@/lib/reports/calendar";
import type { StockSnapshot } from "@/types/domain";

const FINMIND_DATA_URL = "https://api.finmindtrade.com/api/v4/data";

const finMindResponseSchema = z.object({
  status: z.number(),
  data: z.array(
    z.object({
      date: z.string().date(),
      stock_id: z.string(),
      close: z.coerce.number().positive().finite(),
      spread: z.coerce.number().finite(),
    }),
  ),
});

function stockWithUnavailablePrice(
  identity: CoreStockIdentity,
  error: ProviderError,
  sourceName = "FinMind / TaiwanStockPrice",
): StockSnapshot {
  return {
    ...identity,
    price: unavailableEnvelope<number>(sourceName, error),
    dayChangePercent: null,
    revenueGrowth: null,
    epsGrowth: null,
    grossMarginTrend: null,
    freeCashFlowTrend: null,
    forwardPe: null,
    outlook: "未知",
    thesisIntact: null,
    majorRisk: "基本面與風險資料尚未提供。",
    nextEvent: "事件資料尚未提供。",
  };
}

/** Strict FinMind provider. It never reads Fugle credentials or Mock data. */
export class FinMindMarketDataProvider implements MarketDataProvider {
  readonly mode = "delayed" as const;

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async getGlobalMarkets() {
    return [];
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    const token = process.env.FINMIND_API_TOKEN;
    if (!token) {
      const error = new ProviderError(
        "NOT_CONFIGURED",
        "未設定 FINMIND_API_TOKEN，FinMind 資料 unavailable。",
      );
      return CORE_STOCKS.map((identity) =>
        stockWithUnavailablePrice(
          identity,
          identity.market === "TW"
            ? error
            : new ProviderError(
                "NOT_CONFIGURED",
                "美股正式行情 Provider 尚未設定。",
              ),
          identity.market === "TW"
            ? "FinMind / TaiwanStockPrice"
            : "US market provider",
        ),
      );
    }

    return Promise.all(
      CORE_STOCKS.map(async (identity) => {
        if (identity.market !== "TW")
          return stockWithUnavailablePrice(
            identity,
            new ProviderError(
              "NOT_CONFIGURED",
              "美股正式行情 Provider 尚未設定。",
            ),
            "US market provider",
          );
        try {
          return await this.fetchTaiwanStock(identity, token);
        } catch (error) {
          return stockWithUnavailablePrice(
            identity,
            normalizeProviderError(error, "FinMind"),
          );
        }
      }),
    );
  }

  private async fetchTaiwanStock(
    identity: CoreStockIdentity,
    token: string,
  ): Promise<StockSnapshot> {
    const endDate = taipeiDate();
    const query = new URLSearchParams({
      dataset: "TaiwanStockPrice",
      data_id: identity.symbol,
      start_date: taipeiDate(subDays(new Date(), 14)),
      end_date: endDate,
    });
    const response = await this.fetcher(`${FINMIND_DATA_URL}?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw providerHttpError("FinMind", response.status);

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ProviderError(
        "INVALID_RESPONSE",
        "FinMind 回傳無法解析的資料。",
      );
    }
    const parsed = finMindResponseSchema.safeParse(json);
    if (!parsed.success || parsed.data.status !== 200)
      throw new ProviderError(
        "INVALID_RESPONSE",
        "FinMind 回傳格式或狀態不正確。",
      );
    const latest = parsed.data.data
      .filter((row) => row.stock_id === identity.symbol)
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    if (!latest)
      throw new ProviderError("EMPTY_DATA", "FinMind 查無最近交易資料。");
    if (latest.date > endDate)
      throw new ProviderError(
        "INVALID_MARKET_DATE",
        "FinMind 回傳不正確的交易日期。",
      );

    const previousClose = latest.close - latest.spread;
    const dayChangePercent =
      previousClose <= 0 ? null : (latest.spread / previousClose) * 100;
    const fetchedAt = new Date().toISOString();
    return {
      ...identity,
      price: {
        value: latest.close,
        dataMode: "delayed",
        sourceName: "FinMind / TaiwanStockPrice",
        sourceUrl: FINMIND_DATA_URL,
        marketDate: latest.date,
        fetchedAt,
        lastSuccessfulFetchAt: fetchedAt,
        isDelayed: true,
        confidence: 88,
      },
      dayChangePercent,
      revenueGrowth: null,
      epsGrowth: null,
      grossMarginTrend: null,
      freeCashFlowTrend: null,
      forwardPe: null,
      outlook: "未知",
      thesisIntact: null,
      majorRisk: "基本面與風險資料尚未提供。",
      nextEvent: "事件資料尚未提供。",
    };
  }
}
