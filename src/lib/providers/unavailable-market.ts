import type { MarketDataProvider } from "@/lib/providers/contracts";
import { CORE_STOCKS } from "@/lib/providers/core-stocks";
import { unavailableEnvelope } from "@/lib/providers/envelopes";
import { ProviderError } from "@/lib/providers/errors";
import type { StockSnapshot } from "@/types/domain";

export class UnavailableMarketDataProvider implements MarketDataProvider {
  readonly mode = "unavailable" as const;

  constructor(
    private readonly error = new ProviderError(
      "NOT_CONFIGURED",
      "正式資料模式尚未完成設定。",
    ),
  ) {}

  async getGlobalMarkets() {
    return [];
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    return CORE_STOCKS.map((identity) => ({
      ...identity,
      price: unavailableEnvelope<number>("尚無可用正式資料", this.error),
      dayChangePercent: null,
      revenueGrowth: null,
      epsGrowth: null,
      grossMarginTrend: null,
      freeCashFlowTrend: null,
      forwardPe: null,
      outlook: "未知",
      thesisIntact: null,
      majorRisk: "風險資料 unavailable。",
      nextEvent: "事件資料 unavailable。",
    }));
  }
}
