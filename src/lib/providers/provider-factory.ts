import {
  resolveRuntimeDataMode,
  type DataModeResolution,
} from "@/lib/config/data-mode";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { FugleRealtimeTaiwanProvider } from "@/lib/market/fugle";
import { MockRealtimeTaiwanProvider } from "@/lib/market/mock";
import { OfficialTaiwanMarketProvider } from "@/lib/market/official-taiwan";
import {
  unavailableQuote,
  UnavailableRealtimeTaiwanProvider,
} from "@/lib/market/unavailable";
import { YahooTaiwanMarketProvider } from "@/lib/market/yahoo";
import type { MarketDataProvider } from "@/lib/providers/contracts";
import { ManualMarketDataProvider } from "@/lib/providers/manual-market";
import { MockMarketDataProvider } from "@/lib/providers/mock-market";
import { OfficialEquityMarketProvider } from "@/lib/providers/official-equity-market";
import { OfficialGlobalMarketProvider } from "@/lib/providers/official-global-market";
import { normalizeProviderError, ProviderError } from "@/lib/providers/errors";
import { staleEnvelope } from "@/lib/providers/envelopes";
import { UnavailableMarketDataProvider } from "@/lib/providers/unavailable-market";
import type { MarketQuote, StockSnapshot } from "@/types/domain";
import type { LiveQuote } from "@/types/market";
import type { CandleInterval } from "@/types/market";

const reportStockCache = new Map<string, StockSnapshot>();
const globalMarketCache = new Map<string, MarketQuote>();
const quoteCache = new Map<string, LiveQuote>();

function unavailableFromResolution(resolution: DataModeResolution) {
  return new ProviderError(
    resolution.errorCode ?? "NOT_CONFIGURED",
    resolution.warning ?? "正式資料模式尚未完成設定。",
  );
}

export class LiveReportMarketDataProvider implements MarketDataProvider {
  readonly mode = "delayed" as const;

  constructor(
    private readonly globalProvider: Pick<
      MarketDataProvider,
      "getGlobalMarkets"
    > = new OfficialGlobalMarketProvider(),
    private readonly stockProvider: Pick<
      MarketDataProvider,
      "getCoreStocks"
    > = new OfficialEquityMarketProvider(),
  ) {}

  getGlobalMarkets() {
    return this.globalProvider.getGlobalMarkets();
  }

  getCoreStocks() {
    return this.stockProvider.getCoreStocks();
  }
}

class CascadingRealtimeTaiwanProvider implements RealtimeTaiwanMarketProvider {
  constructor(
    private readonly providers: RealtimeTaiwanMarketProvider[],
    private readonly searchProvider = new OfficialTaiwanMarketProvider(),
  ) {}

  search(query: string, limit?: number) {
    return this.searchProvider.search(query, limit);
  }

  async getQuotes(symbols: string[]) {
    const remaining = new Set(symbols);
    const selected = new Map<string, LiveQuote>();
    for (const provider of this.providers) {
      if (remaining.size === 0) break;
      const rows = await provider.getQuotes([...remaining]);
      for (const row of rows) {
        if (row.price === null || row.dataMode === "unavailable") continue;
        selected.set(row.symbol, row);
        remaining.delete(row.symbol);
      }
    }
    return symbols.map(
      (symbol) =>
        selected.get(symbol) ??
        unavailableQuote(
          symbol,
          "Fugle / Yahoo Finance / 臺灣官方行情",
          `${symbol} 的正式行情來源目前皆 unavailable。`,
          "PROVIDER_UNAVAILABLE",
        ),
    );
  }
}

function createLiveRealtimeTaiwanProvider() {
  const fallbackProviders: RealtimeTaiwanMarketProvider[] = [
    new YahooTaiwanMarketProvider(),
    new OfficialTaiwanMarketProvider(),
  ];
  const fugleKey = process.env.FUGLE_MARKETDATA_API_KEY;
  if (fugleKey)
    fallbackProviders.unshift(new FugleRealtimeTaiwanProvider(fugleKey));
  return new CascadingRealtimeTaiwanProvider(fallbackProviders);
}

export class StaleAwareMarketDataProvider implements MarketDataProvider {
  readonly mode;

  constructor(private readonly provider: MarketDataProvider) {
    this.mode = provider.mode;
  }

  async getGlobalMarkets() {
    const rows = await this.provider.getGlobalMarkets();
    return rows.map((row) => {
      if (row.price.value !== null && row.price.dataMode !== "unavailable") {
        globalMarketCache.set(row.symbol, row);
        return row;
      }
      const cached = globalMarketCache.get(row.symbol);
      if (!cached) return row;
      const error = new ProviderError(
        (row.price.errorCode as ProviderError["code"]) ??
          "PROVIDER_UNAVAILABLE",
        row.price.errorMessage ?? "市場資料暫時無法更新。",
      );
      return {
        ...cached,
        price: staleEnvelope(cached.price, error),
        changePercent: staleEnvelope(cached.changePercent, error),
      };
    });
  }

  async getCoreStocks() {
    const rows = await this.provider.getCoreStocks();
    return rows.map((row) => {
      if (row.price.value !== null && row.price.dataMode !== "unavailable") {
        reportStockCache.set(row.symbol, row);
        return row;
      }
      const cached = reportStockCache.get(row.symbol);
      if (!cached) return row;
      const error = new ProviderError(
        (row.price.errorCode as ProviderError["code"]) ??
          "PROVIDER_UNAVAILABLE",
        row.price.errorMessage ?? "股票資料暫時無法更新。",
      );
      return { ...cached, price: staleEnvelope(cached.price, error) };
    });
  }
}

export class StaleAwareRealtimeTaiwanProvider implements RealtimeTaiwanMarketProvider {
  constructor(private readonly provider: RealtimeTaiwanMarketProvider) {}

  search(query: string, limit?: number) {
    return this.provider.search(query, limit);
  }

  async getQuotes(symbols: string[]) {
    let rows: LiveQuote[];
    try {
      rows = await this.provider.getQuotes(symbols);
    } catch (error) {
      const normalized = normalizeProviderError(error, "台股行情 Provider");
      rows = symbols.map((symbol) =>
        unavailableQuote(
          symbol,
          "台股行情 Provider",
          normalized.message,
          normalized.code,
        ),
      );
    }
    return rows.map((row) => {
      if (
        row.price !== null &&
        (row.dataMode === "live" || row.dataMode === "delayed")
      ) {
        quoteCache.set(row.symbol, row);
        return row;
      }
      const cached = quoteCache.get(row.symbol);
      if (!cached) return row;
      return {
        ...cached,
        dataMode: "stale" as const,
        status: "stale" as const,
        fetchedAt: new Date().toISOString(),
        lastSuccessfulFetchAt: cached.lastSuccessfulFetchAt ?? cached.fetchedAt,
        isDelayed: true,
        errorCode: row.errorCode ?? "PROVIDER_UNAVAILABLE",
        errorMessage:
          row.errorMessage ?? "行情暫時無法更新，顯示上次成功資料。",
      };
    });
  }
}

export function createReportMarketProvider(
  resolution = resolveRuntimeDataMode(),
): MarketDataProvider {
  if (resolution.mode === "mock") return new MockMarketDataProvider();
  if (resolution.mode === "manual") return new ManualMarketDataProvider();
  if (resolution.mode === "unavailable")
    return new UnavailableMarketDataProvider(
      unavailableFromResolution(resolution),
    );
  return new StaleAwareMarketDataProvider(
    new LiveReportMarketDataProvider(
      new OfficialGlobalMarketProvider(),
      new OfficialEquityMarketProvider(createLiveRealtimeTaiwanProvider()),
    ),
  );
}

export function createRealtimeTaiwanProvider(
  resolution = resolveRuntimeDataMode(),
): RealtimeTaiwanMarketProvider {
  if (resolution.mode === "mock") return new MockRealtimeTaiwanProvider();
  if (resolution.mode !== "live")
    return new UnavailableRealtimeTaiwanProvider(
      resolution.warning ?? "此資料模式不提供即時行情。",
    );
  return new StaleAwareRealtimeTaiwanProvider(
    createLiveRealtimeTaiwanProvider(),
  );
}

export function createTaiwanSearchProvider(
  resolution = resolveRuntimeDataMode(),
): RealtimeTaiwanMarketProvider {
  if (resolution.mode === "mock") return new MockRealtimeTaiwanProvider();
  if (resolution.mode === "live") return new OfficialTaiwanMarketProvider();
  return new UnavailableRealtimeTaiwanProvider(
    resolution.warning ?? "目前資料模式不提供正式股票清單。",
  );
}

export type CandleSourceSelection =
  | { kind: "mock" }
  | { kind: "fugle"; apiKey: string }
  | { kind: "finmind" }
  | { kind: "yahoo" }
  | {
      kind: "unavailable";
      errorCode: "NOT_CONFIGURED" | "PROVIDER_UNAVAILABLE";
      errorMessage: string;
    };

export function selectCandleSource(
  interval: CandleInterval,
  resolution = resolveRuntimeDataMode(),
): CandleSourceSelection {
  if (resolution.mode === "mock") return { kind: "mock" };
  if (resolution.mode !== "live")
    return {
      kind: "unavailable",
      errorCode: "NOT_CONFIGURED",
      errorMessage:
        resolution.warning ?? "此資料模式沒有可用的 K 線 Provider。",
    };
  if (interval === "tick")
    return {
      kind: "unavailable",
      errorCode: "PROVIDER_UNAVAILABLE",
      errorMessage: "Tick 尚未啟用合法串流與時序儲存層。",
    };
  const apiKey = process.env.FUGLE_MARKETDATA_API_KEY;
  if (apiKey) return { kind: "fugle", apiKey };
  if (["1d", "1w", "1mo"].includes(interval) && process.env.FINMIND_API_TOKEN)
    return { kind: "finmind" };
  return { kind: "yahoo" };
}

export function resetProviderCachesForTests() {
  reportStockCache.clear();
  globalMarketCache.clear();
  quoteCache.clear();
}
