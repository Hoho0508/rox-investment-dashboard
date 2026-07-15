import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import {
  fetchFinMindCandles,
  searchFinMindSecurities,
} from "@/lib/market/finmind-market";
import { MockRealtimeTaiwanProvider } from "@/lib/market/mock";
import type { LiveQuote } from "@/types/market";
import type { CandleInterval, PriceCandle } from "@/types/market";
import { unavailableQuote } from "@/lib/market/unavailable";

const BASE_URL = "https://api.fugle.tw/marketdata/v1.0/stock";
const quoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  lastPrice: z.number().nullish(),
  closePrice: z.number().nullish(),
  previousClose: z.number().nullish(),
  openPrice: z.number().nullish(),
  highPrice: z.number().nullish(),
  lowPrice: z.number().nullish(),
  change: z.number().nullish(),
  changePercent: z.number().nullish(),
  lastUpdated: z.number().nullish(),
  isClose: z.boolean().optional(),
  total: z.object({ tradeVolume: z.number().nullish() }).optional(),
});
const candleSchema = z.object({
  data: z.array(
    z.object({
      date: z.string(),
      open: z.coerce.number(),
      high: z.coerce.number(),
      low: z.coerce.number(),
      close: z.coerce.number(),
      volume: z.coerce.number(),
    }),
  ),
});

export async function fetchFugleIntradayCandles(
  symbol: string,
  interval: CandleInterval,
  apiKey: string,
): Promise<PriceCandle[]> {
  const timeframe = interval.replace("m", "");
  if (!["1", "5", "15", "30", "60"].includes(timeframe))
    throw new Error("Fugle 不支援此分鐘週期");
  const url = new URL(
    `${BASE_URL}/intraday/candles/${encodeURIComponent(symbol)}`,
  );
  url.searchParams.set("timeframe", timeframe);
  const response = await fetch(url, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Fugle 分鐘 K HTTP ${response.status}`);
  const parsed = candleSchema.parse(await response.json());
  return parsed.data
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

export class FugleRealtimeTaiwanProvider implements RealtimeTaiwanMarketProvider {
  private readonly fallback = new MockRealtimeTaiwanProvider();

  constructor(private readonly apiKey: string) {}

  async search(query: string, limit = 20) {
    try {
      return await searchFinMindSecurities(query, limit);
    } catch {
      return process.env.DATA_MODE === "live"
        ? []
        : this.fallback.search(query, limit);
    }
  }

  async getQuotes(symbols: string[]): Promise<LiveQuote[]> {
    const fallback = await this.fallback.getQuotes(symbols);
    return Promise.all(
      symbols.map(async (symbol, index) => {
        try {
          const response = await fetch(
            `${BASE_URL}/intraday/quote/${encodeURIComponent(symbol)}`,
            {
              headers: { "X-API-KEY": this.apiKey, Accept: "application/json" },
              signal: AbortSignal.timeout(6_000),
              cache: "no-store",
            },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const quote = quoteSchema.parse(await response.json());
          const price = quote.lastPrice ?? quote.closePrice ?? null;
          const asOf = quote.lastUpdated
            ? new Date(Math.floor(quote.lastUpdated / 1000)).toISOString()
            : new Date().toISOString();
          return {
            symbol: quote.symbol,
            name: quote.name,
            exchange: quote.exchange === "TWSE" ? "TWSE" : "TPEx",
            market: "TW",
            price,
            previousClose: quote.previousClose ?? null,
            open: quote.openPrice ?? null,
            high: quote.highPrice ?? null,
            low: quote.lowPrice ?? null,
            change: quote.change ?? null,
            changePercent: quote.changePercent ?? null,
            volume: quote.total?.tradeVolume ?? null,
            asOf,
            sourceName: "Fugle 即時行情",
            sourceUrl: `${BASE_URL}/intraday/quote/${symbol}`,
            dataMode: "live",
            isDelayed: false,
            status: quote.isClose ? "closed" : "open",
          } satisfies LiveQuote;
        } catch (error) {
          if (process.env.DATA_MODE === "live")
            return unavailableQuote(
              symbol,
              "Fugle 暫時無法取得",
              `Fugle 取得失敗：${error instanceof Error ? error.message : "未知錯誤"}`,
            );
          return {
            ...fallback[index],
            error: `Fugle 取得失敗：${error instanceof Error ? error.message : "未知錯誤"}`,
          };
        }
      }),
    );
  }

  async getCandles(symbol: string, limit = 320) {
    try {
      return await fetchFinMindCandles(symbol, limit);
    } catch {
      return process.env.DATA_MODE === "live"
        ? []
        : this.fallback.getCandles(symbol, limit);
    }
  }
}
