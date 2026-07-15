import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { unavailableQuote } from "@/lib/market/unavailable";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import type { CandleInterval, LiveQuote, PriceCandle } from "@/types/market";
import type { TaiwanSecurity } from "@/types/market";

const BASE_URL = "https://api.fugle.tw/marketdata/v1.0/stock";

const quoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  lastPrice: z.number().positive().nullish(),
  closePrice: z.number().positive().nullish(),
  previousClose: z.number().positive().nullish(),
  openPrice: z.number().positive().nullish(),
  highPrice: z.number().positive().nullish(),
  lowPrice: z.number().positive().nullish(),
  change: z.number().nullish(),
  changePercent: z.number().nullish(),
  lastUpdated: z.number().positive().nullish(),
  isClose: z.boolean().optional(),
  total: z
    .object({ tradeVolume: z.number().nonnegative().nullish() })
    .optional(),
});

const candleRowSchema = z.object({
  date: z.string(),
  open: z.coerce.number().positive().finite(),
  high: z.coerce.number().positive().finite(),
  low: z.coerce.number().positive().finite(),
  close: z.coerce.number().positive().finite(),
  volume: z.coerce.number().nonnegative().finite(),
});

const candleSchema = z.object({ data: z.array(candleRowSchema) });

async function parseJson(response: Response) {
  if (!response.ok) throw providerHttpError("Fugle", response.status);
  try {
    return await response.json();
  } catch {
    throw new ProviderError("INVALID_RESPONSE", "Fugle 回傳無法解析的資料。");
  }
}

function timestampToIso(value?: number | null) {
  if (!value) return new Date().toISOString();
  const milliseconds =
    value > 100_000_000_000_000
      ? Math.floor(value / 1000)
      : value > 100_000_000_000
        ? value
        : value * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime()))
    throw new ProviderError(
      "INVALID_MARKET_DATE",
      "Fugle 回傳不正確的行情時間。",
    );
  return date.toISOString();
}

function exchange(value: string): LiveQuote["exchange"] {
  return value === "TWSE" ? "TWSE" : value === "TPEx" ? "TPEx" : "UNKNOWN";
}

export async function fetchFugleIntradayCandles(
  symbol: string,
  interval: CandleInterval,
  apiKey: string,
): Promise<PriceCandle[]> {
  const timeframe = interval.replace("m", "");
  if (!["1", "5", "15", "30", "60"].includes(timeframe))
    throw new ProviderError("INVALID_RESPONSE", "Fugle 不支援此分鐘週期。");
  const url = new URL(
    `${BASE_URL}/intraday/candles/${encodeURIComponent(symbol)}`,
  );
  url.searchParams.set("timeframe", timeframe);
  const response = await fetch(url, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  const parsed = candleSchema.safeParse(await parseJson(response));
  if (!parsed.success)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "Fugle 分鐘 K 回傳格式不正確。",
    );
  if (parsed.data.data.length === 0)
    throw new ProviderError("EMPTY_DATA", "Fugle 分鐘 K 沒有資料。 ");
  for (const row of parsed.data.data) {
    if (
      row.high < Math.max(row.open, row.close) ||
      row.low > Math.min(row.open, row.close) ||
      row.high < row.low
    )
      throw new ProviderError(
        "INVALID_RESPONSE",
        "Fugle 分鐘 K OHLC 資料不一致。",
      );
  }
  return parsed.data.data
    .map((item) => ({
      time: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export async function fetchFugleCandles(
  symbol: string,
  interval: CandleInterval,
  apiKey: string,
): Promise<PriceCandle[]> {
  if (["1m", "5m", "15m", "30m", "60m"].includes(interval))
    return fetchFugleIntradayCandles(symbol, interval, apiKey);
  const timeframe = interval === "1w" ? "W" : interval === "1mo" ? "M" : "D";
  const years = interval === "1mo" ? 15 : interval === "1w" ? 8 : 3;
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - years);
  const url = new URL(
    `${BASE_URL}/historical/candles/${encodeURIComponent(symbol)}`,
  );
  url.searchParams.set("from", from.toISOString().slice(0, 10));
  url.searchParams.set("to", new Date().toISOString().slice(0, 10));
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("fields", "open,high,low,close,volume");
  url.searchParams.set("sort", "asc");
  const response = await fetch(url, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
    next: { revalidate: 300 },
  });
  const parsed = candleSchema.safeParse(await parseJson(response));
  if (!parsed.success)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "Fugle 歷史 K 線回傳格式不正確。",
    );
  if (parsed.data.data.length === 0)
    throw new ProviderError("EMPTY_DATA", "Fugle 歷史 K 線沒有資料。 ");
  return parsed.data.data
    .filter(
      (row) =>
        row.high >= Math.max(row.open, row.close) &&
        row.low <= Math.min(row.open, row.close) &&
        row.high >= row.low,
    )
    .map((item) => ({
      time: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Strict Fugle quote provider. It never calls FinMind or Mock providers. */
export class FugleRealtimeTaiwanProvider implements RealtimeTaiwanMarketProvider {
  constructor(private readonly apiKey: string) {}

  async search(_query: string, _limit = 20): Promise<TaiwanSecurity[]> {
    void _query;
    void _limit;
    throw new ProviderError(
      "PROVIDER_UNAVAILABLE",
      "Fugle quote provider 不提供股票清單搜尋。",
    );
  }

  async getQuotes(symbols: string[]): Promise<LiveQuote[]> {
    return Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `${BASE_URL}/intraday/quote/${encodeURIComponent(symbol)}`,
            {
              headers: { "X-API-KEY": this.apiKey, Accept: "application/json" },
              signal: AbortSignal.timeout(6_000),
              cache: "no-store",
            },
          );
          const parsed = quoteSchema.safeParse(await parseJson(response));
          if (!parsed.success)
            throw new ProviderError(
              "INVALID_RESPONSE",
              "Fugle 行情回傳格式不正確。",
            );
          const quote = parsed.data;
          if (quote.symbol !== symbol)
            throw new ProviderError(
              "INVALID_RESPONSE",
              "Fugle 回傳的股票代碼不一致。",
            );
          const price = quote.lastPrice ?? quote.closePrice ?? null;
          if (price === null)
            throw new ProviderError("EMPTY_DATA", "Fugle 行情沒有成交價格。 ");
          const fetchedAt = new Date().toISOString();
          return {
            symbol: quote.symbol,
            name: quote.name || symbol,
            exchange: exchange(quote.exchange),
            market: "TW",
            price,
            previousClose: quote.previousClose ?? null,
            open: quote.openPrice ?? null,
            high: quote.highPrice ?? null,
            low: quote.lowPrice ?? null,
            change: quote.change ?? null,
            changePercent: quote.changePercent ?? null,
            volume: quote.total?.tradeVolume ?? null,
            asOf: timestampToIso(quote.lastUpdated),
            fetchedAt,
            sourceName: "Fugle 即時行情",
            sourceUrl: `${BASE_URL}/intraday/quote/${symbol}`,
            dataMode: "live",
            isDelayed: false,
            status: quote.isClose ? "closed" : "open",
            lastSuccessfulFetchAt: fetchedAt,
          } satisfies LiveQuote;
        } catch (error) {
          const normalized = normalizeProviderError(error, "Fugle");
          return unavailableQuote(
            symbol,
            "Fugle 即時行情",
            normalized.message,
            normalized.code,
          );
        }
      }),
    );
  }
}
