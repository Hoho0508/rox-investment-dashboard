import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { unavailableQuote } from "@/lib/market/unavailable";
import { rocDateToIso } from "@/lib/providers/official-global-market";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import type { LiveQuote, TaiwanSecurity } from "@/types/market";

const TWSE_STOCK_URL =
  "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const TPEX_STOCK_URL =
  "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes";

const twseSchema = z.array(
  z.object({
    Date: z.string(),
    Code: z.string(),
    Name: z.string(),
    TradeVolume: z.string(),
    OpeningPrice: z.string(),
    HighestPrice: z.string(),
    LowestPrice: z.string(),
    ClosingPrice: z.string(),
    Change: z.string(),
  }),
);

const tpexSchema = z.array(
  z.object({
    Date: z.string(),
    SecuritiesCompanyCode: z.string(),
    CompanyName: z.string(),
    Close: z.string(),
    Change: z.string(),
    Open: z.string(),
    High: z.string(),
    Low: z.string(),
    TradingShares: z.string(),
  }),
);

type OfficialTaiwanRow = {
  symbol: string;
  name: string;
  exchange: "TWSE" | "TPEx";
  close: number;
  change: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  marketDate: string;
  sourceName: string;
  sourceUrl: string;
};

let officialCache: { expiresAt: number; rows: OfficialTaiwanRow[] } | undefined;

function number(value: string, allowNull = false) {
  const normalized = value.replaceAll(",", "").replace(/^\+/, "").trim();
  if (!normalized && allowNull) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    if (allowNull) return null;
    throw new ProviderError(
      "INVALID_RESPONSE",
      "臺灣證交所或櫃買中心資料包含非數字欄位。",
    );
  }
  return parsed;
}

async function json(response: Response, provider: string) {
  if (!response.ok) throw providerHttpError(provider, response.status);
  try {
    return await response.json();
  } catch {
    throw new ProviderError(
      "INVALID_RESPONSE",
      `${provider}回傳無法解析的資料。`,
    );
  }
}

async function fetchTwse(fetcher: typeof fetch) {
  const response = await fetcher(TWSE_STOCK_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4_500),
    next: { revalidate: 300 },
  });
  const parsed = twseSchema.safeParse(await json(response, "臺灣證券交易所"));
  if (!parsed.success)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "臺灣證券交易所股票行情格式不正確。",
    );
  return parsed.data.flatMap((item): OfficialTaiwanRow[] => {
    const close = number(item.ClosingPrice, true);
    if (close === null || close <= 0) return [];
    return [
      {
        symbol: item.Code,
        name: item.Name,
        exchange: "TWSE",
        close,
        change: number(item.Change, true) ?? 0,
        open: number(item.OpeningPrice, true),
        high: number(item.HighestPrice, true),
        low: number(item.LowestPrice, true),
        volume: number(item.TradeVolume, true),
        marketDate: rocDateToIso(item.Date),
        sourceName: "臺灣證券交易所 OpenAPI / 上市個股日成交資訊",
        sourceUrl: TWSE_STOCK_URL,
      },
    ];
  });
}

async function fetchTpex(fetcher: typeof fetch) {
  const response = await fetcher(TPEX_STOCK_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4_500),
    next: { revalidate: 300 },
  });
  const parsed = tpexSchema.safeParse(await json(response, "證券櫃檯買賣中心"));
  if (!parsed.success)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "證券櫃檯買賣中心股票行情格式不正確。",
    );
  return parsed.data.flatMap((item): OfficialTaiwanRow[] => {
    const close = number(item.Close, true);
    if (close === null || close <= 0) return [];
    return [
      {
        symbol: item.SecuritiesCompanyCode,
        name: item.CompanyName,
        exchange: "TPEx",
        close,
        change: number(item.Change, true) ?? 0,
        open: number(item.Open, true),
        high: number(item.High, true),
        low: number(item.Low, true),
        volume: number(item.TradingShares, true),
        marketDate: rocDateToIso(item.Date),
        sourceName: "證券櫃檯買賣中心 OpenAPI / 上櫃股票收盤行情",
        sourceUrl: TPEX_STOCK_URL,
      },
    ];
  });
}

export async function fetchOfficialTaiwanRows(fetcher: typeof fetch = fetch) {
  if (officialCache && officialCache.expiresAt > Date.now())
    return officialCache.rows;
  const results = await Promise.allSettled([
    fetchTwse(fetcher),
    fetchTpex(fetcher),
  ]);
  const rows = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (rows.length === 0) {
    const firstFailure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    throw normalizeProviderError(
      firstFailure?.reason,
      "臺灣證交所與櫃買中心 OpenAPI",
    );
  }
  officialCache = { expiresAt: Date.now() + 300_000, rows };
  return rows;
}

export class OfficialTaiwanMarketProvider implements RealtimeTaiwanMarketProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async search(query: string, limit = 20): Promise<TaiwanSecurity[]> {
    const normalized = query.trim().toLowerCase();
    return (await fetchOfficialTaiwanRows(this.fetcher))
      .filter(
        (item) =>
          !normalized ||
          item.symbol.toLowerCase().includes(normalized) ||
          item.name.toLowerCase().includes(normalized),
      )
      .slice(0, limit)
      .map((item) => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        market: "TW" as const,
      }));
  }

  async getQuotes(symbols: string[]): Promise<LiveQuote[]> {
    let rows: OfficialTaiwanRow[];
    try {
      rows = await fetchOfficialTaiwanRows(this.fetcher);
    } catch (error) {
      const normalized = normalizeProviderError(error, "臺灣官方收盤行情");
      return symbols.map((symbol) =>
        unavailableQuote(
          symbol,
          "臺灣官方收盤行情",
          normalized.message,
          normalized.code,
        ),
      );
    }
    const fetchedAt = new Date().toISOString();
    return symbols.map((symbol) => {
      const item = rows.find((candidate) => candidate.symbol === symbol);
      if (!item)
        return unavailableQuote(
          symbol,
          "臺灣官方收盤行情",
          `${symbol} 查無上市或上櫃收盤行情。`,
          "EMPTY_DATA",
        );
      const previousClose = item.close - item.change;
      return {
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        market: "TW",
        price: item.close,
        previousClose: previousClose > 0 ? previousClose : null,
        open: item.open,
        high: item.high,
        low: item.low,
        change: item.change,
        changePercent:
          previousClose > 0 ? (item.change / previousClose) * 100 : null,
        volume: item.volume,
        asOf: `${item.marketDate}T13:30:00+08:00`,
        fetchedAt,
        lastSuccessfulFetchAt: fetchedAt,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        dataMode: "delayed",
        isDelayed: true,
        status: "delayed",
      } satisfies LiveQuote;
    });
  }
}

export function resetOfficialTaiwanCacheForTests() {
  officialCache = undefined;
}
