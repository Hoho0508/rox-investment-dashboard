import {
  FinMindDelayedTaiwanProvider,
  fetchFinMindCandles,
  searchFinMindSecurities,
} from "@/lib/market/finmind-market";
import {
  fetchFugleIntradayCandles,
  FugleRealtimeTaiwanProvider,
} from "@/lib/market/fugle";
import {
  mockIntradayCandles,
  MockRealtimeTaiwanProvider,
} from "@/lib/market/mock";
import type { CandleInterval, CandleSeries, PriceCandle } from "@/types/market";

const mock = new MockRealtimeTaiwanProvider();
const finMindDelayed = new FinMindDelayedTaiwanProvider();

export function getRealtimeTaiwanProvider() {
  const key = process.env.FUGLE_MARKETDATA_API_KEY;
  return key ? new FugleRealtimeTaiwanProvider(key) : finMindDelayed;
}

export async function searchTaiwanSecurities(query: string, limit = 20) {
  try {
    return await searchFinMindSecurities(query, limit);
  } catch {
    return mock.search(query, limit);
  }
}

export async function getTaiwanCandles(symbol: string, limit = 320) {
  try {
    const rows = await fetchFinMindCandles(symbol, limit);
    return rows.length >= 80 ? rows : mock.getCandles(symbol, limit);
  } catch {
    return mock.getCandles(symbol, limit);
  }
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

export async function getTaiwanCandleSeries(
  symbol: string,
  interval: CandleInterval,
): Promise<CandleSeries> {
  const now = new Date().toISOString();
  if (interval === "tick")
    return {
      symbol,
      interval,
      candles: [],
      sourceName: "尚未啟用 Tick 儲存層",
      dataMode: "mock",
      isDelayed: true,
      supportsLive: false,
      asOf: now,
      error: "Tick 需要 Fugle trades 串流與伺服器端時序儲存，已列入 Roadmap。",
    };

  if (["1m", "5m", "15m", "30m", "60m"].includes(interval)) {
    const apiKey = process.env.FUGLE_MARKETDATA_API_KEY;
    if (apiKey) {
      try {
        const candles = await fetchFugleIntradayCandles(
          symbol,
          interval,
          apiKey,
        );
        return {
          symbol,
          interval,
          candles,
          sourceName: "Fugle Intraday Candles",
          sourceUrl:
            "https://api.fugle.tw/marketdata/v1.0/stock/intraday/candles",
          dataMode: "live",
          isDelayed: false,
          supportsLive: true,
          asOf: candles.at(-1)?.time ?? now,
        };
      } catch (error) {
        const candles = mockIntradayCandles(symbol, interval);
        return {
          symbol,
          interval,
          candles,
          sourceName: "Rox 模擬分鐘 K",
          dataMode: "mock",
          isDelayed: true,
          supportsLive: false,
          asOf: now,
          error:
            error instanceof Error ? error.message : "Fugle 分鐘 K 取得失敗",
        };
      }
    }
    const candles = mockIntradayCandles(symbol, interval);
    return {
      symbol,
      interval,
      candles,
      sourceName: "Rox 模擬分鐘 K",
      dataMode: "mock",
      isDelayed: true,
      supportsLive: false,
      asOf: now,
      error: "未設定 FUGLE_MARKETDATA_API_KEY，分鐘 K 為模擬資料。",
    };
  }

  const daily = await getTaiwanCandles(symbol, 520);
  const candles =
    interval === "1d"
      ? daily
      : interval === "1w"
        ? aggregateCandles(daily, "1w")
        : aggregateCandles(daily, "1mo");
  return {
    symbol,
    interval,
    candles,
    sourceName: "FinMind / TaiwanStockPrice",
    sourceUrl: "https://api.finmindtrade.com/api/v4/data",
    dataMode: "live",
    isDelayed: true,
    supportsLive: false,
    asOf: candles.at(-1)?.time ?? now,
  };
}
