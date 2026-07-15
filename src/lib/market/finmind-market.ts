import { subDays, subYears } from "date-fns";
import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { unavailableQuote } from "@/lib/market/unavailable";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import { taipeiDate } from "@/lib/reports/calendar";
import type { LiveQuote, PriceCandle, TaiwanSecurity } from "@/types/market";

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

const priceRowSchema = z.object({
  date: z.string().date(),
  open: z.coerce.number().positive().finite(),
  max: z.coerce.number().positive().finite(),
  min: z.coerce.number().positive().finite(),
  close: z.coerce.number().positive().finite(),
  Trading_Volume: z.coerce.number().nonnegative().finite(),
});

const priceSchema = z.object({
  status: z.number(),
  data: z.array(priceRowSchema),
});

let securityCache: { expiresAt: number; rows: TaiwanSecurity[] } | undefined;

function finMindHeaders() {
  const token = process.env.FINMIND_API_TOKEN;
  if (!token)
    throw new ProviderError(
      "NOT_CONFIGURED",
      "未設定 FINMIND_API_TOKEN，FinMind 資料 unavailable。",
    );
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function parseJson(response: Response, provider: string) {
  if (!response.ok) throw providerHttpError(provider, response.status);
  try {
    return await response.json();
  } catch {
    throw new ProviderError(
      "INVALID_RESPONSE",
      `${provider} 回傳無法解析的資料。`,
    );
  }
}

function validatePriceRows(
  rows: z.infer<typeof priceRowSchema>[],
  symbol: string,
) {
  for (const row of rows) {
    if (
      row.max < Math.max(row.open, row.close) ||
      row.min > Math.min(row.open, row.close) ||
      row.max < row.min
    )
      throw new ProviderError(
        "INVALID_RESPONSE",
        `FinMind ${symbol} OHLC 資料不一致。`,
      );
  }
}

export async function searchFinMindSecurities(query: string, limit = 20) {
  if (!securityCache || securityCache.expiresAt < Date.now()) {
    const url = new URL(DATA_URL);
    url.searchParams.set("dataset", "TaiwanStockInfo");
    const response = await fetch(url, {
      headers: finMindHeaders(),
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 21_600 },
    });
    const parsed = infoSchema.safeParse(await parseJson(response, "FinMind"));
    if (!parsed.success || parsed.data.status !== 200)
      throw new ProviderError(
        "INVALID_RESPONSE",
        "FinMind 股票清單格式或狀態不正確。",
      );
    if (parsed.data.data.length === 0)
      throw new ProviderError("EMPTY_DATA", "FinMind 股票清單為空。 ");
    securityCache = {
      expiresAt: Date.now() + 21_600_000,
      rows: parsed.data.data
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
    headers: finMindHeaders(),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const parsed = priceSchema.safeParse(await parseJson(response, "FinMind"));
  if (!parsed.success || parsed.data.status !== 200)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "FinMind 歷史資料格式或狀態不正確。",
    );
  if (parsed.data.data.length === 0)
    throw new ProviderError("EMPTY_DATA", "FinMind 歷史資料為空。 ");
  validatePriceRows(parsed.data.data, symbol);
  return parsed.data.data
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

async function fetchRecentCandles(symbol: string) {
  const url = new URL(DATA_URL);
  url.searchParams.set("dataset", "TaiwanStockPrice");
  url.searchParams.set("data_id", symbol);
  url.searchParams.set("start_date", taipeiDate(subDays(new Date(), 30)));
  url.searchParams.set("end_date", taipeiDate());
  const response = await fetch(url, {
    headers: finMindHeaders(),
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  const parsed = priceSchema.safeParse(await parseJson(response, "FinMind"));
  if (!parsed.success || parsed.data.status !== 200)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "FinMind 最新收盤價格式或狀態不正確。",
    );
  if (parsed.data.data.length === 0)
    throw new ProviderError("EMPTY_DATA", "FinMind 查無最近交易資料。 ");
  validatePriceRows(parsed.data.data, symbol);
  return parsed.data.data
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-2);
}

/** Strict FinMind delayed quote provider. It never uses Mock data. */
export class FinMindDelayedTaiwanProvider implements RealtimeTaiwanMarketProvider {
  async search(query: string, limit = 20) {
    return searchFinMindSecurities(query, limit);
  }

  async getQuotes(symbols: string[]): Promise<LiveQuote[]> {
    return Promise.all(
      symbols.map(async (symbol) => {
        try {
          const [securityRows, prices] = await Promise.all([
            searchFinMindSecurities(symbol, 10),
            fetchRecentCandles(symbol),
          ]);
          const latest = prices.at(-1);
          const previous = prices.at(-2);
          if (!latest)
            throw new ProviderError("EMPTY_DATA", "FinMind 查無最近交易資料。");
          const security = securityRows.find((item) => item.symbol === symbol);
          const previousClose = previous?.close ?? latest.close;
          const change = latest.close - previousClose;
          const fetchedAt = new Date().toISOString();
          return {
            symbol,
            name: security?.name ?? symbol,
            exchange: security?.exchange ?? "UNKNOWN",
            market: "TW",
            price: latest.close,
            previousClose,
            open: latest.open,
            high: latest.max,
            low: latest.min,
            change,
            changePercent:
              previousClose <= 0 ? null : (change / previousClose) * 100,
            volume: latest.Trading_Volume,
            asOf: `${latest.date}T13:30:00+08:00`,
            fetchedAt,
            sourceName: "FinMind / TaiwanStockPrice",
            sourceUrl: DATA_URL,
            dataMode: "delayed",
            isDelayed: true,
            status: "delayed",
            lastSuccessfulFetchAt: fetchedAt,
          } satisfies LiveQuote;
        } catch (error) {
          const normalized = normalizeProviderError(error, "FinMind");
          return unavailableQuote(
            symbol,
            "FinMind / TaiwanStockPrice",
            normalized.message,
            normalized.code,
          );
        }
      }),
    );
  }
}

export function resetFinMindMarketCacheForTests() {
  securityCache = undefined;
}
