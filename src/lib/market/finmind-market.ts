import { subYears } from "date-fns";
import { z } from "zod";
import { taipeiDate } from "@/lib/reports/calendar";
import type { PriceCandle, TaiwanSecurity } from "@/types/market";

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
