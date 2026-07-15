import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { OfficialTaiwanMarketProvider } from "@/lib/market/official-taiwan";
import {
  fetchYahooFundamentals,
  fetchYahooQuote,
  YAHOO_FINANCE_URL,
  type YahooFundamentalResult,
} from "@/lib/market/yahoo";
import { CORE_STOCKS } from "@/lib/providers/core-stocks";
import { unavailableEnvelope } from "@/lib/providers/envelopes";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import type {
  DataEnvelope,
  StockFundamentalValues,
  StockSnapshot,
} from "@/types/domain";
import type { LiveQuote } from "@/types/market";

const TWSE_OPENAPI_ROOT = "https://openapi.twse.com.tw/v1";
const TWSE_REVENUE_URL = `${TWSE_OPENAPI_ROOT}/opendata/t187ap05_L`;
const TWSE_INCOME_URL = `${TWSE_OPENAPI_ROOT}/opendata/t187ap06_L_ci`;
const TWSE_MARGIN_URL = `${TWSE_OPENAPI_ROOT}/opendata/t187ap17_L`;
const TWSE_PE_URL = `${TWSE_OPENAPI_ROOT}/exchangeReport/BWIBBU_ALL`;

const revenueSchema = z.array(
  z.object({
    出表日期: z.string(),
    資料年月: z.string(),
    公司代號: z.string(),
    公司名稱: z.string(),
    "營業收入-去年同月增減(%)": z.string(),
  }),
);

const incomeSchema = z.array(
  z.object({
    出表日期: z.string(),
    年度: z.string(),
    季別: z.string(),
    公司代號: z.string(),
    公司名稱: z.string(),
    "基本每股盈餘（元）": z.string(),
  }),
);

const marginSchema = z.array(
  z.object({
    出表日期: z.string(),
    年度: z.string(),
    季別: z.string(),
    公司代號: z.string(),
    公司名稱: z.string(),
    "毛利率(%)(營業毛利)/(營業收入)": z.string(),
  }),
);

const peSchema = z.array(
  z.object({
    Date: z.string(),
    Code: z.string(),
    Name: z.string(),
    PEratio: z.string(),
  }),
);

type TwseFundamentalResult = {
  eps: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  trailingPe: number | null;
  marketDate: string | undefined;
};

function number(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function rocPeriod(value: string | undefined) {
  if (!value) return undefined;
  const match = /^(\d{3})(\d{2})(\d{2})?$/.exec(value);
  if (!match) return undefined;
  return `${Number(match[1]) + 1911}-${match[2]}-${match[3] ?? "01"}`;
}

async function fetchJson(url: string, provider: string, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4_500),
    next: { revalidate: 21_600 },
  });
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

async function fetchTwseFundamentals(symbols: string[], fetcher: typeof fetch) {
  const requests = await Promise.allSettled([
    fetchJson(TWSE_REVENUE_URL, "TWSE 月營收", fetcher),
    fetchJson(TWSE_INCOME_URL, "TWSE 綜合損益表", fetcher),
    fetchJson(TWSE_MARGIN_URL, "TWSE 營益分析", fetcher),
    fetchJson(TWSE_PE_URL, "TWSE 本益比", fetcher),
  ]);
  const revenue =
    requests[0].status === "fulfilled"
      ? revenueSchema.safeParse(requests[0].value)
      : undefined;
  const income =
    requests[1].status === "fulfilled"
      ? incomeSchema.safeParse(requests[1].value)
      : undefined;
  const margin =
    requests[2].status === "fulfilled"
      ? marginSchema.safeParse(requests[2].value)
      : undefined;
  const pe =
    requests[3].status === "fulfilled"
      ? peSchema.safeParse(requests[3].value)
      : undefined;
  if (!revenue?.success && !income?.success && !margin?.success && !pe?.success)
    throw new ProviderError(
      "PROVIDER_UNAVAILABLE",
      "TWSE 基本面資料目前無法取得。",
    );

  return new Map(
    symbols.map((symbol): [string, TwseFundamentalResult] => {
      const revenueRow = revenue?.success
        ? revenue.data.find((item) => item.公司代號 === symbol)
        : undefined;
      const incomeRow = income?.success
        ? income.data.find((item) => item.公司代號 === symbol)
        : undefined;
      const marginRow = margin?.success
        ? margin.data.find((item) => item.公司代號 === symbol)
        : undefined;
      const peRow = pe?.success
        ? pe.data.find((item) => item.Code === symbol)
        : undefined;
      const dates = [
        rocPeriod(revenueRow?.出表日期),
        rocPeriod(incomeRow?.出表日期),
        rocPeriod(marginRow?.出表日期),
        rocPeriod(peRow?.Date),
      ].filter((item): item is string => Boolean(item));
      return [
        symbol,
        {
          eps: number(incomeRow?.["基本每股盈餘（元）"]),
          revenueGrowth: number(revenueRow?.["營業收入-去年同月增減(%)"]),
          grossMargin: number(marginRow?.["毛利率(%)(營業毛利)/(營業收入)"]),
          trailingPe: number(peRow?.PEratio),
          marketDate: dates.sort().at(-1),
        },
      ];
    }),
  );
}

function priceEnvelope(quote: LiveQuote): DataEnvelope<number> {
  if (quote.price === null)
    return unavailableEnvelope<number>(
      quote.sourceName,
      new ProviderError(
        (quote.errorCode as ProviderError["code"]) ?? "PROVIDER_UNAVAILABLE",
        quote.errorMessage ?? "行情 unavailable。",
      ),
    );
  return {
    value: quote.price,
    dataMode: quote.dataMode,
    sourceName: quote.sourceName,
    sourceUrl: quote.sourceUrl,
    marketDate: quote.asOf.slice(0, 10),
    fetchedAt: quote.fetchedAt,
    lastSuccessfulFetchAt: quote.lastSuccessfulFetchAt ?? quote.fetchedAt,
    isDelayed: quote.isDelayed,
    confidence: quote.dataMode === "live" ? 95 : 82,
    errorCode: quote.errorCode,
    errorMessage: quote.errorMessage,
  };
}

function unavailableFundamentals(
  sourceName: string,
  error: ProviderError,
): DataEnvelope<StockFundamentalValues> {
  return unavailableEnvelope<StockFundamentalValues>(sourceName, error);
}

function mergedTwseFundamentals(
  official: TwseFundamentalResult | undefined,
  yahoo: YahooFundamentalResult | undefined,
): DataEnvelope<StockFundamentalValues> {
  if (!official && !yahoo)
    return unavailableFundamentals(
      "TWSE OpenAPI + Yahoo Finance fundamentals",
      new ProviderError(
        "PROVIDER_UNAVAILABLE",
        "台股基本面來源目前皆無法取得。",
      ),
    );
  const fetchedAt = new Date().toISOString();
  const values: StockFundamentalValues = {
    eps: official?.eps ?? yahoo?.values.eps ?? null,
    revenueGrowth:
      official?.revenueGrowth ?? yahoo?.values.revenueGrowth ?? null,
    epsGrowth: yahoo?.values.epsGrowth ?? null,
    grossMargin: official?.grossMargin ?? yahoo?.values.grossMargin ?? null,
    grossMarginTrend: yahoo?.values.grossMarginTrend ?? null,
    freeCashFlow: yahoo?.values.freeCashFlow ?? null,
    freeCashFlowTrend: yahoo?.values.freeCashFlowTrend ?? null,
    trailingPe: official?.trailingPe ?? yahoo?.values.trailingPe ?? null,
    forwardPe: null,
  };
  return {
    value: values,
    dataMode: "delayed",
    sourceName: yahoo
      ? "臺灣證券交易所 OpenAPI + Yahoo Finance fundamentals"
      : "臺灣證券交易所 OpenAPI",
    sourceUrl: TWSE_OPENAPI_ROOT,
    marketDate: [official?.marketDate, yahoo?.marketDate]
      .filter((item): item is string => Boolean(item))
      .sort()
      .at(-1),
    fetchedAt,
    lastSuccessfulFetchAt: fetchedAt,
    isDelayed: true,
    confidence: yahoo ? 86 : 78,
    errorCode: "PARTIAL_DATA",
    errorMessage:
      "預估本益比需要分析師一致預期授權；目前本益比不會冒充預估本益比。",
  };
}

function yahooFundamentalEnvelope(
  result: YahooFundamentalResult | undefined,
  error?: ProviderError,
) {
  if (!result)
    return unavailableFundamentals(
      "Yahoo Finance fundamentals",
      error ??
        new ProviderError(
          "PROVIDER_UNAVAILABLE",
          "NVDA 基本面資料目前無法取得。",
        ),
    );
  const fetchedAt = new Date().toISOString();
  return {
    value: result.values,
    dataMode: "delayed" as const,
    sourceName: "Yahoo Finance fundamentals",
    sourceUrl: `${YAHOO_FINANCE_URL}/quote/NVDA/financials`,
    marketDate: result.marketDate,
    fetchedAt,
    lastSuccessfulFetchAt: fetchedAt,
    isDelayed: true,
    confidence: 82,
    errorCode: "PARTIAL_DATA",
    errorMessage:
      "預估本益比需要分析師一致預期授權；目前本益比不會冒充預估本益比。",
  } satisfies DataEnvelope<StockFundamentalValues>;
}

function stockSnapshot(
  identity: (typeof CORE_STOCKS)[number],
  price: DataEnvelope<number>,
  dayChangePercent: number | null,
  fundamentals: DataEnvelope<StockFundamentalValues>,
): StockSnapshot {
  const values = fundamentals.value;
  return {
    ...identity,
    price,
    dayChangePercent,
    revenueGrowth: values?.revenueGrowth ?? null,
    epsGrowth: values?.epsGrowth ?? null,
    grossMarginTrend: values?.grossMarginTrend ?? null,
    freeCashFlowTrend: values?.freeCashFlowTrend ?? null,
    forwardPe: values?.forwardPe ?? null,
    fundamentals,
    outlook: "未知",
    thesisIntact: null,
    majorRisk: "需同時檢查公司公告、產業循環與資料時效。",
    nextEvent: "下一次正式財報或法說會公告。",
  };
}

/** Real report-equity provider. No Mock data and no FinMind requirement. */
export class OfficialEquityMarketProvider {
  readonly mode = "delayed" as const;

  constructor(
    private readonly taiwanProvider: RealtimeTaiwanMarketProvider = new OfficialTaiwanMarketProvider(),
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async getGlobalMarkets() {
    return [];
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    const taiwanSymbols = CORE_STOCKS.filter(
      (item) => item.market === "TW",
    ).map((item) => item.symbol);
    const [taiwanQuotesResult, twseResult, nvdaQuoteResult] =
      await Promise.allSettled([
        this.taiwanProvider.getQuotes(taiwanSymbols),
        fetchTwseFundamentals(taiwanSymbols, this.fetcher),
        fetchYahooQuote("NVDA", this.fetcher),
      ]);
    const taiwanQuotes =
      taiwanQuotesResult.status === "fulfilled" ? taiwanQuotesResult.value : [];
    const twseFundamentals =
      twseResult.status === "fulfilled" ? twseResult.value : new Map();
    const nvdaChart =
      nvdaQuoteResult.status === "fulfilled" ? nvdaQuoteResult.value : null;

    const prices = new Map(
      taiwanQuotes.map((quote) => [quote.symbol, quote] as const),
    );
    const yahooFundamentalResults = await Promise.allSettled(
      CORE_STOCKS.map((identity) => {
        const price =
          identity.market === "TW"
            ? (prices.get(identity.symbol)?.price ?? 0)
            : (nvdaChart?.marketPrice ?? 0);
        return price > 0
          ? fetchYahooFundamentals(identity.symbol, price, this.fetcher)
          : Promise.reject(
              new ProviderError(
                "EMPTY_DATA",
                `${identity.symbol} 缺少價格，無法計算估值。`,
              ),
            );
      }),
    );

    return CORE_STOCKS.map((identity, index) => {
      const yahooResult = yahooFundamentalResults[index];
      const yahooFundamentals =
        yahooResult.status === "fulfilled" ? yahooResult.value : undefined;
      if (identity.market === "TW") {
        const quote = prices.get(identity.symbol);
        const price = quote
          ? priceEnvelope(quote)
          : unavailableEnvelope<number>(
              "臺灣官方行情 + Yahoo Finance",
              new ProviderError(
                "PROVIDER_UNAVAILABLE",
                `${identity.symbol} 行情目前無法取得。`,
              ),
            );
        return stockSnapshot(
          identity,
          price,
          quote?.changePercent ?? null,
          mergedTwseFundamentals(
            twseFundamentals.get(identity.symbol),
            yahooFundamentals,
          ),
        );
      }
      const nvdaPrice = nvdaChart
        ? {
            value: nvdaChart.marketPrice,
            dataMode: "delayed" as const,
            sourceName: "Yahoo Finance Chart / Nasdaq",
            sourceUrl: `${YAHOO_FINANCE_URL}/quote/NVDA`,
            marketDate: nvdaChart.marketTime.slice(0, 10),
            fetchedAt: new Date().toISOString(),
            lastSuccessfulFetchAt: new Date().toISOString(),
            isDelayed: true,
            confidence: 82,
          }
        : unavailableEnvelope<number>(
            "Yahoo Finance Chart / Nasdaq",
            normalizeProviderError(
              nvdaQuoteResult.status === "rejected"
                ? nvdaQuoteResult.reason
                : undefined,
              "Yahoo Finance NVDA",
            ),
          );
      const previousClose = nvdaChart?.previousClose ?? null;
      const changePercent =
        nvdaChart && previousClose && previousClose > 0
          ? ((nvdaChart.marketPrice - previousClose) / previousClose) * 100
          : null;
      return stockSnapshot(
        identity,
        nvdaPrice,
        changePercent,
        yahooFundamentalEnvelope(
          yahooFundamentals,
          yahooResult.status === "rejected"
            ? normalizeProviderError(
                yahooResult.reason,
                "Yahoo Finance fundamentals",
              )
            : undefined,
        ),
      );
    });
  }
}
