import { subDays, subYears } from "date-fns";
import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { MockRealtimeTaiwanProvider } from "@/lib/market/mock";
import { taipeiDate } from "@/lib/reports/calendar";
import type { LiveQuote, PriceCandle, TaiwanSecurity } from "@/types/market";
import { unavailableQuote } from "@/lib/market/unavailable";

const DATA_URL = "https://api.finmindtrade.com/api/v4/data";
const infoSchema = z.object({
  status: z.number(),
  data: z.array(
    z.object({
      stock_id: z.string(),
      stock_name: z.string(),
      type: z.string(),
    }),
  ),
});
const priceSchema = z.object({
  status: z.number(),
  data: z.array(
    z.object({
      date: z.string(),
      open: z.coerce.number(),
      max: z.coerce.number(),
      min: z.coerce.number(),
      close: z.coerce.number(),
      Trading_Volume: z.coerce.number(),
    }),
  ),
});

let securityCache: { expiresAt: number; rows: TaiwanSecurity[] } | undefined;

function authHeaders() {
  const token = process.env.FINMIND_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function searchFinMindSecurities(query: string, limit = 20) {
  if (!securityCache || securityCache.expiresAt < Date.now()) {
    const url = new URL(DATA_URL);
    url.searchParams.set("dataset", "TaiwanStockInfo");
    const response = await fetch(url, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 21_600 },
    });
    if (!response.ok) throw new Error(`FinMind 清單 HTTP ${response.status}`);
    const parsed = infoSchema.parse(await response.json());
    securityCache = {
      expiresAt: Date.now() + 21_600_000,
      rows: parsed.data
        .filter((item) => ["twse", "tpex"].includes(item.type.toLowerCase()))
        .map((item) => ({
          symbol: item.stock_id,
          name: item.stock_name,
          exchange: item.type.toLowerCase() === "twse" ? "TWSE" : "TPEx",
          market: "TW" as const,
        })),
    };
  }
  const normalized = query.trim().toLowerCase();
  return securityCache.rows
    .filter(
      (item) =>
        !normalized ||
        item.symbol.toLowerCase().includes(normalized) ||
        item.name.toLowerCase().includes(normalized),
    )
    .slice(0, limit);
}

export async function fetchFinMindCandles(
  symbol: string,
  limit = 320,
): Promise<PriceCandle[]> {
  const url = new URL(DATA_URL);
  url.searchParams.set("dataset", "TaiwanStockPrice");
  url.searchParams.set("data_id", symbol);
  url.searchParams.set("start_date", taipeiDate(subYears(new Date(), 2)));
  url.searchParams.set("end_date", taipeiDate());
  const response = await fetch(url, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`FinMind 歷史資料 HTTP ${response.status}`);
  const parsed = priceSchema.parse(await response.json());
  return parsed.data
    .map((item) => ({
      time: item.date,
      open: item.open,
      high: item.max,
      low: item.min,
      close: item.close,
      volume: item.Trading_Volume,
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-limit);
}

const delayedQuoteCache = new Map<
  string,
  { expiresAt: number; quote: LiveQuote }
>();

async function fetchRecentCandles(symbol: string) {
  const url = new URL(DATA_URL);
  url.searchParams.set("dataset", "TaiwanStockPrice");
  url.searchParams.set("data_id", symbol);
  url.searchParams.set("start_date", taipeiDate(subDays(new Date(), 30)));
  url.searchParams.set("end_date", taipeiDate());
  const response = await fetch(url, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`FinMind 最新收盤價 HTTP ${response.status}`);
  const parsed = priceSchema.parse(await response.json());
  return parsed.data.sort((a, b) => a.date.localeCompare(b.date)).slice(-2);
}

export class FinMindDelayedTaiwanProvider implements RealtimeTaiwanMarketProvider {
  private readonly fallback = new MockRealtimeTaiwanProvider();

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
        const cached = delayedQuoteCache.get(symbol);
        if (cached && cached.expiresAt > Date.now()) return cached.quote;
        try {
          const [securityRows, prices] = await Promise.all([
            searchFinMindSecurities(symbol, 10),
            fetchRecentCandles(symbol),
          ]);
          const latest = prices.at(-1);
          const previous = prices.at(-2);
          if (!latest) throw new Error("查無最近交易資料");
          const security = securityRows.find((item) => item.symbol === symbol);
          const previousClose = previous?.close ?? latest.close;
          const change = latest.close - previousClose;
          const quote: LiveQuote = {
            symbol,
            name: security?.name ?? fallback[index].name,
            exchange: security?.exchange ?? fallback[index].exchange,
            market: "TW",
            price: latest.close,
            previousClose,
            open: latest.open,
            high: latest.max,
            low: latest.min,
            change,
            changePercent:
              previousClose === 0 ? 0 : (change / previousClose) * 100,
            volume: latest.Trading_Volume,
            asOf: `${latest.date}T13:30:00+08:00`,
            sourceName: "FinMind / TaiwanStockPrice",
            sourceUrl: DATA_URL,
            dataMode: "live",
            isDelayed: true,
            status: "delayed",
          };
          delayedQuoteCache.set(symbol, {
            expiresAt: Date.now() + 300_000,
            quote,
          });
          return quote;
        } catch (error) {
          if (process.env.DATA_MODE === "live")
            return unavailableQuote(
              symbol,
              "FinMind 暫時無法取得",
              `FinMind 最新收盤價取得失敗：${error instanceof Error ? error.message : "未知錯誤"}`,
            );
          return {
            ...fallback[index],
            error: `FinMind 最新收盤價取得失敗：${error instanceof Error ? error.message : "未知錯誤"}`,
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
