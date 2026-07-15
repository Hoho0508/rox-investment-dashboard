import { fetchFinMindCandles } from "@/lib/market/finmind-market";
import { fetchFugleCandles } from "@/lib/market/fugle";
import { mockCandles, mockIntradayCandles } from "@/lib/market/mock";
import { fetchYahooCandles } from "@/lib/market/yahoo";
import { normalizeProviderError } from "@/lib/providers/errors";
import { resolveRuntimeDataMode } from "@/lib/config/data-mode";
import {
  createRealtimeTaiwanProvider,
  createTaiwanSearchProvider,
  selectCandleSource,
} from "@/lib/providers/provider-factory";
import type {
  CandleInterval,
  CandleSeries,
  PriceCandle,
  TaiwanSecuritySearchResult,
} from "@/types/market";

const candleCache = new Map<string, CandleSeries>();

export function getRealtimeTaiwanProvider() {
  return createRealtimeTaiwanProvider();
}

export async function searchTaiwanSecurities(
  query: string,
  limit = 20,
): Promise<TaiwanSecuritySearchResult> {
  const resolution = resolveRuntimeDataMode();
  const fetchedAt = new Date().toISOString();
  try {
    const value = await createTaiwanSearchProvider(resolution).search(
      query,
      limit,
    );
    return {
      value,
      dataMode: resolution.mode === "mock" ? "mock" : "delayed",
      sourceName:
        resolution.mode === "mock"
          ? "Rox Mock 股票清單"
          : "臺灣證券交易所、櫃買中心與 ISIN 公開資料",
      fetchedAt,
      lastSuccessfulFetchAt: fetchedAt,
      isDelayed: true,
      confidence: resolution.mode === "mock" ? 50 : 90,
    };
  } catch (error) {
    const normalized = normalizeProviderError(error, "台股股票清單");
    return {
      value: null,
      dataMode: "unavailable",
      sourceName: "台股股票清單",
      fetchedAt,
      isDelayed: true,
      confidence: 0,
      errorCode: normalized.code,
      errorMessage: normalized.message,
    };
  }
}

export async function getTaiwanCandles(symbol: string, limit = 320) {
  const series = await getTaiwanCandleSeries(symbol, "1d", limit);
  return series.candles;
}

function aggregateCandles(
  candles: PriceCandle[],
  interval: "1w" | "1mo",
): PriceCandle[] {
  const groups = new Map<string, PriceCandle[]>();
  for (const candle of candles) {
    const date = new Date(candle.time);
    const key =
      interval === "1mo"
        ? candle.time.slice(0, 7)
        : `${date.getUTCFullYear()}-${Math.floor(
            (Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
            ) -
              Date.UTC(date.getUTCFullYear(), 0, 1)) /
              604_800_000,
          )}`;
    groups.set(key, [...(groups.get(key) ?? []), candle]);
  }
  return [...groups.values()].map((rows) => ({
    time: rows[0].time,
    open: rows[0].open,
    high: Math.max(...rows.map((item) => item.high)),
    low: Math.min(...rows.map((item) => item.low)),
    close: rows.at(-1)!.close,
    volume: rows.reduce((total, item) => total + item.volume, 0),
  }));
}

function unavailableSeries(
  symbol: string,
  interval: CandleInterval,
  errorCode: string,
  errorMessage: string,
): CandleSeries {
  const fetchedAt = new Date().toISOString();
  return {
    symbol,
    interval,
    candles: [],
    sourceName: "尚無可用正式 K 線",
    dataMode: "unavailable",
    isDelayed: true,
    supportsLive: false,
    asOf: fetchedAt,
    fetchedAt,
    errorCode,
    errorMessage,
  };
}

function staleOrUnavailable(
  symbol: string,
  interval: CandleInterval,
  errorCode: string,
  errorMessage: string,
) {
  const cached = candleCache.get(`${symbol}:${interval}`);
  if (!cached)
    return unavailableSeries(symbol, interval, errorCode, errorMessage);
  return {
    ...cached,
    dataMode: "stale" as const,
    isDelayed: true,
    fetchedAt: new Date().toISOString(),
    lastSuccessfulFetchAt: cached.lastSuccessfulFetchAt ?? cached.fetchedAt,
    errorCode,
    errorMessage,
  };
}

function buildLiveSeries(
  symbol: string,
  interval: CandleInterval,
  limit: number,
  sourceKind: "fugle" | "finmind" | "yahoo",
  raw: PriceCandle[],
  fallbackMessage?: string,
) {
  const fetchedAt = new Date().toISOString();
  const normalized =
    sourceKind === "finmind" && interval === "1w"
      ? aggregateCandles(raw, "1w")
      : sourceKind === "finmind" && interval === "1mo"
        ? aggregateCandles(raw, "1mo")
        : raw;
  const candles = normalized.slice(-limit);
  const series: CandleSeries = {
    symbol,
    interval,
    candles,
    sourceName:
      sourceKind === "fugle"
        ? "Fugle Candles"
        : sourceKind === "finmind"
          ? "FinMind / TaiwanStockPrice"
          : "Yahoo Finance Chart",
    sourceUrl:
      sourceKind === "fugle"
        ? "https://api.fugle.tw/marketdata/v1.0/stock"
        : sourceKind === "finmind"
          ? "https://api.finmindtrade.com/api/v4/data"
          : "https://finance.yahoo.com",
    dataMode: sourceKind === "fugle" ? "live" : "delayed",
    isDelayed: sourceKind !== "fugle",
    supportsLive: sourceKind === "fugle",
    asOf: candles.at(-1)?.time ?? fetchedAt,
    fetchedAt,
    lastSuccessfulFetchAt: fetchedAt,
    errorCode: fallbackMessage ? "PRIMARY_SOURCE_UNAVAILABLE" : undefined,
    errorMessage: fallbackMessage,
  };
  candleCache.set(`${symbol}:${interval}`, series);
  return series;
}

export async function getTaiwanCandleSeries(
  symbol: string,
  interval: CandleInterval,
  limit = interval === "1d" || interval === "1w" || interval === "1mo"
    ? 520
    : 320,
): Promise<CandleSeries> {
  const source = selectCandleSource(interval);
  const fetchedAt = new Date().toISOString();

  if (source.kind === "unavailable")
    return staleOrUnavailable(
      symbol,
      interval,
      source.errorCode,
      source.errorMessage,
    );

  if (source.kind === "mock") {
    const isIntraday = ["1m", "5m", "15m", "30m", "60m"].includes(interval);
    const candles = isIntraday
      ? mockIntradayCandles(symbol, interval)
      : interval === "tick"
        ? []
        : mockCandles(symbol, limit);
    if (interval === "tick")
      return unavailableSeries(
        symbol,
        interval,
        "PROVIDER_UNAVAILABLE",
        "Mock mode 不提供 Tick 資料。",
      );
    const aggregated =
      interval === "1w"
        ? aggregateCandles(candles, "1w")
        : interval === "1mo"
          ? aggregateCandles(candles, "1mo")
          : candles;
    return {
      symbol,
      interval,
      candles: aggregated,
      sourceName: isIntraday ? "Rox 模擬分鐘 K" : "Rox 模擬日 K",
      dataMode: "mock",
      isDelayed: true,
      supportsLive: false,
      asOf: aggregated.at(-1)?.time ?? fetchedAt,
      fetchedAt,
      errorCode: "MOCK_DATA",
      errorMessage: isIntraday
        ? "目前為 DATA_MODE=mock 的模擬分鐘 K，不代表真實盤中行情。"
        : "目前為 DATA_MODE=mock 的模擬 K 線，不代表真實市場行情。",
    };
  }

  try {
    const raw =
      source.kind === "fugle"
        ? await fetchFugleCandles(symbol, interval, source.apiKey)
        : source.kind === "finmind"
          ? await fetchFinMindCandles(symbol, limit)
          : (await fetchYahooCandles(symbol, interval, limit)).candles;
    return buildLiveSeries(symbol, interval, limit, source.kind, raw);
  } catch (error) {
    const provider =
      source.kind === "fugle"
        ? "Fugle"
        : source.kind === "finmind"
          ? "FinMind"
          : "Yahoo Finance";
    const normalized = normalizeProviderError(error, provider);
    if (source.kind !== "yahoo") {
      try {
        const yahoo = await fetchYahooCandles(symbol, interval, limit);
        return buildLiveSeries(
          symbol,
          interval,
          limit,
          "yahoo",
          yahoo.candles,
          `${provider} 暫時 unavailable，已改用 Yahoo Finance 延遲 K 線。`,
        );
      } catch (yahooError) {
        const yahooNormalized = normalizeProviderError(
          yahooError,
          "Yahoo Finance",
        );
        return staleOrUnavailable(
          symbol,
          interval,
          yahooNormalized.code,
          `${normalized.message}；${yahooNormalized.message}`,
        );
      }
    }
    return staleOrUnavailable(
      symbol,
      interval,
      normalized.code,
      normalized.message,
    );
  }
}

export function resetCandleCacheForTests() {
  candleCache.clear();
}
