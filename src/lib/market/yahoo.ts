import { z } from "zod";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { unavailableQuote } from "@/lib/market/unavailable";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import type { StockFundamentalValues } from "@/types/domain";
import type {
  CandleInterval,
  LiveQuote,
  PriceCandle,
  TaiwanSecurity,
} from "@/types/market";

const YAHOO_CHART_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const YAHOO_TIMESERIES_BASE =
  "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries";

export const YAHOO_FINANCE_URL = "https://finance.yahoo.com";

const nullableNumber = z.number().finite().nullable();
const chartResultSchema = z.object({
  meta: z.object({
    symbol: z.string(),
    longName: z.string().optional(),
    shortName: z.string().optional(),
    exchangeName: z.string().optional(),
    regularMarketPrice: z.number().positive().finite().optional(),
    chartPreviousClose: z.number().positive().finite().optional(),
    previousClose: z.number().positive().finite().optional(),
    regularMarketTime: z.number().int().positive().optional(),
  }),
  timestamp: z.array(z.number().int().positive()).nullish(),
  indicators: z.object({
    quote: z
      .array(
        z.object({
          open: z.array(nullableNumber).nullish(),
          high: z.array(nullableNumber).nullish(),
          low: z.array(nullableNumber).nullish(),
          close: z.array(nullableNumber).nullish(),
          volume: z.array(nullableNumber).nullish(),
        }),
      )
      .min(1),
  }),
});

const chartResponseSchema = z.object({
  chart: z.object({
    result: z.array(chartResultSchema).nullable(),
    error: z.unknown().nullable(),
  }),
});

const seriesValueSchema = z.object({
  asOfDate: z.string().date(),
  reportedValue: z.object({ raw: z.number().finite() }),
});

const timeseriesEntrySchema = z
  .object({
    meta: z.object({ type: z.array(z.string()) }),
  })
  .catchall(z.unknown());

const timeseriesResponseSchema = z.object({
  timeseries: z.object({
    result: z.array(timeseriesEntrySchema).nullable(),
    error: z.unknown().nullable().optional(),
  }),
});

type YahooChart = {
  resolvedSymbol: string;
  name: string;
  marketPrice: number;
  previousClose: number | null;
  marketTime: string;
  candles: PriceCandle[];
};

export type YahooFundamentalResult = {
  values: StockFundamentalValues;
  marketDate: string;
};

function yahooCandidates(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!/^\d{4,6}[A-Z]?$/.test(normalized) || normalized.includes("."))
    return [normalized];
  return [`${normalized}.TW`, `${normalized}.TWO`];
}

function chartQuery(interval: CandleInterval) {
  switch (interval) {
    case "1m":
      return { interval: "1m", range: "1d" };
    case "5m":
      return { interval: "5m", range: "5d" };
    case "15m":
      return { interval: "15m", range: "1mo" };
    case "30m":
      return { interval: "30m", range: "1mo" };
    case "60m":
      return { interval: "60m", range: "3mo" };
    case "1w":
      return { interval: "1wk", range: "5y" };
    case "1mo":
      return { interval: "1mo", range: "10y" };
    default:
      return { interval: "1d", range: "2y" };
  }
}

function parseCandles(result: z.infer<typeof chartResultSchema>) {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators.quote[0];
  const candles: PriceCandle[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    const volume = quote.volume?.[index];
    if (
      open === null ||
      open === undefined ||
      high === null ||
      high === undefined ||
      low === null ||
      low === undefined ||
      close === null ||
      close === undefined ||
      volume === null ||
      volume === undefined ||
      high < Math.max(open, close) ||
      low > Math.min(open, close) ||
      high < low
    )
      continue;
    candles.push({
      time: new Date(timestamps[index] * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return candles;
}

async function fetchYahooChart(
  symbol: string,
  interval: CandleInterval,
  fetcher: typeof fetch = fetch,
): Promise<YahooChart> {
  const query = chartQuery(interval);
  let lastError: unknown;
  for (const candidate of yahooCandidates(symbol)) {
    const url = new URL(`${YAHOO_CHART_BASE}/${encodeURIComponent(candidate)}`);
    url.searchParams.set("interval", query.interval);
    url.searchParams.set("range", query.range);
    try {
      const response = await fetcher(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 RoxInvestmentDashboard/1.0",
        },
        signal: AbortSignal.timeout(4_500),
        next: { revalidate: interval === "1m" ? 30 : 300 },
      });
      if (!response.ok)
        throw providerHttpError("Yahoo Finance", response.status);
      const parsed = chartResponseSchema.safeParse(await response.json());
      const result = parsed.success ? parsed.data.chart.result?.[0] : undefined;
      if (!result)
        throw new ProviderError(
          "INVALID_RESPONSE",
          "Yahoo Finance 行情格式不正確。",
        );
      const candles = parseCandles(result);
      const marketPrice =
        result.meta.regularMarketPrice ?? candles.at(-1)?.close ?? null;
      if (marketPrice === null)
        throw new ProviderError("EMPTY_DATA", "Yahoo Finance 查無成交價格。");
      const marketTime = result.meta.regularMarketTime
        ? new Date(result.meta.regularMarketTime * 1000).toISOString()
        : (candles.at(-1)?.time ?? new Date().toISOString());
      return {
        resolvedSymbol: result.meta.symbol,
        name: result.meta.longName ?? result.meta.shortName ?? symbol,
        marketPrice,
        previousClose:
          result.meta.chartPreviousClose ?? result.meta.previousClose ?? null,
        marketTime,
        candles,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw normalizeProviderError(lastError, "Yahoo Finance");
}

export async function fetchYahooCandles(
  symbol: string,
  interval: CandleInterval,
  limit = 520,
  fetcher: typeof fetch = fetch,
) {
  const result = await fetchYahooChart(symbol, interval, fetcher);
  if (result.candles.length === 0)
    throw new ProviderError("EMPTY_DATA", "Yahoo Finance 查無 K 線資料。");
  return {
    candles: result.candles.slice(-limit),
    resolvedSymbol: result.resolvedSymbol,
    asOf: result.candles.at(-1)?.time ?? result.marketTime,
  };
}

function seriesValues(
  entries: z.infer<typeof timeseriesEntrySchema>[],
  type: string,
) {
  const entry = entries.find((candidate) => candidate.meta.type.includes(type));
  const parsed = z.array(seriesValueSchema).safeParse(entry?.[type]);
  return parsed.success
    ? parsed.data.sort((a, b) => a.asOfDate.localeCompare(b.asOfDate))
    : [];
}

function growth(current: number | undefined, previous: number | undefined) {
  if (current === undefined || previous === undefined || previous === 0)
    return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function latestRaw(values: z.infer<typeof seriesValueSchema>[]) {
  return values.at(-1)?.reportedValue.raw;
}

function freeCashFlow(
  cashFlow: z.infer<typeof seriesValueSchema> | undefined,
  capitalExpenditure: z.infer<typeof seriesValueSchema> | undefined,
) {
  if (!cashFlow || !capitalExpenditure) return null;
  return (
    cashFlow.reportedValue.raw - Math.abs(capitalExpenditure.reportedValue.raw)
  );
}

export async function fetchYahooFundamentals(
  symbol: string,
  price: number,
  fetcher: typeof fetch = fetch,
): Promise<YahooFundamentalResult> {
  const candidate = yahooCandidates(symbol)[0];
  const types = [
    "quarterlyTotalRevenue",
    "quarterlyDilutedEPS",
    "annualDilutedEPS",
    "annualOperatingCashFlow",
    "annualCapitalExpenditure",
    "annualTotalRevenue",
    "annualGrossProfit",
  ];
  const nowSeconds = Math.floor(Date.now() / 1000);
  const period1 = nowSeconds - 6 * 366 * 24 * 60 * 60;
  const url = new URL(
    `${YAHOO_TIMESERIES_BASE}/${encodeURIComponent(candidate)}`,
  );
  url.searchParams.set("symbol", candidate);
  url.searchParams.set("type", types.join(","));
  url.searchParams.set("merge", "false");
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(nowSeconds + 86_400));
  const response = await fetcher(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 RoxInvestmentDashboard/1.0",
    },
    signal: AbortSignal.timeout(5_000),
    next: { revalidate: 21_600 },
  });
  if (!response.ok)
    throw providerHttpError("Yahoo Finance fundamentals", response.status);
  const parsed = timeseriesResponseSchema.safeParse(await response.json());
  const entries = parsed.success ? parsed.data.timeseries.result : null;
  if (!entries)
    throw new ProviderError(
      "INVALID_RESPONSE",
      "Yahoo Finance 基本面格式不正確。",
    );

  const quarterlyRevenue = seriesValues(entries, "quarterlyTotalRevenue");
  const quarterlyEps = seriesValues(entries, "quarterlyDilutedEPS");
  const annualEps = seriesValues(entries, "annualDilutedEPS");
  const annualCashFlow = seriesValues(entries, "annualOperatingCashFlow");
  const annualCapex = seriesValues(entries, "annualCapitalExpenditure");
  const annualRevenue = seriesValues(entries, "annualTotalRevenue");
  const annualGrossProfit = seriesValues(entries, "annualGrossProfit");
  const currentFcf = freeCashFlow(annualCashFlow.at(-1), annualCapex.at(-1));
  const previousFcf = freeCashFlow(annualCashFlow.at(-2), annualCapex.at(-2));
  const latestGrossMargin =
    latestRaw(annualGrossProfit) !== undefined &&
    latestRaw(annualRevenue) !== undefined &&
    latestRaw(annualRevenue)! !== 0
      ? (latestRaw(annualGrossProfit)! / latestRaw(annualRevenue)!) * 100
      : null;
  const previousGrossMargin =
    annualGrossProfit.at(-2) && annualRevenue.at(-2)?.reportedValue.raw
      ? (annualGrossProfit.at(-2)!.reportedValue.raw /
          annualRevenue.at(-2)!.reportedValue.raw) *
        100
      : null;
  const ttmEps = quarterlyEps
    .slice(-4)
    .reduce((total, item) => total + item.reportedValue.raw, 0);
  const quarterlyEpsGrowth = growth(
    latestRaw(quarterlyEps),
    quarterlyEps.at(-5)?.reportedValue.raw,
  );
  const annualEpsGrowth = growth(
    latestRaw(annualEps),
    annualEps.at(-2)?.reportedValue.raw,
  );
  const marketDate =
    quarterlyRevenue.at(-1)?.asOfDate ??
    quarterlyEps.at(-1)?.asOfDate ??
    annualRevenue.at(-1)?.asOfDate;
  if (!marketDate)
    throw new ProviderError("EMPTY_DATA", "Yahoo Finance 基本面沒有資料。");

  return {
    marketDate,
    values: {
      eps: latestRaw(quarterlyEps) ?? null,
      revenueGrowth: growth(
        latestRaw(quarterlyRevenue),
        quarterlyRevenue.at(-5)?.reportedValue.raw,
      ),
      epsGrowth: quarterlyEpsGrowth ?? annualEpsGrowth,
      grossMargin: latestGrossMargin,
      grossMarginTrend:
        latestGrossMargin !== null && previousGrossMargin !== null
          ? latestGrossMargin - previousGrossMargin
          : null,
      freeCashFlow: currentFcf,
      freeCashFlowTrend:
        currentFcf !== null && previousFcf !== null
          ? growth(currentFcf, previousFcf)
          : null,
      trailingPe: ttmEps > 0 ? price / ttmEps : null,
      forwardPe: null,
    },
  };
}

export async function fetchYahooQuote(
  symbol: string,
  fetcher: typeof fetch = fetch,
) {
  return fetchYahooChart(symbol, "1d", fetcher);
}

/** Public Yahoo chart adapter. Values are real market observations but are
 * conservatively labelled delayed because distribution latency is not
 * guaranteed by an authenticated market-data contract. */
export class YahooTaiwanMarketProvider implements RealtimeTaiwanMarketProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async search(_query: string, _limit = 20): Promise<TaiwanSecurity[]> {
    void _query;
    void _limit;
    throw new ProviderError(
      "PROVIDER_UNAVAILABLE",
      "Yahoo 行情 Adapter 不提供完整台股清單搜尋。",
    );
  }

  async getQuotes(symbols: string[]): Promise<LiveQuote[]> {
    return Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await fetchYahooQuote(symbol, this.fetcher);
          const previousClose = quote.previousClose;
          const change =
            previousClose === null ? null : quote.marketPrice - previousClose;
          const fetchedAt = new Date().toISOString();
          return {
            symbol,
            name: quote.name,
            exchange: quote.resolvedSymbol.endsWith(".TWO") ? "TPEx" : "TWSE",
            market: "TW",
            price: quote.marketPrice,
            previousClose,
            open: quote.candles.at(-1)?.open ?? null,
            high: quote.candles.at(-1)?.high ?? null,
            low: quote.candles.at(-1)?.low ?? null,
            change,
            changePercent:
              change === null || previousClose === null || previousClose <= 0
                ? null
                : (change / previousClose) * 100,
            volume: quote.candles.at(-1)?.volume ?? null,
            asOf: quote.marketTime,
            fetchedAt,
            lastSuccessfulFetchAt: fetchedAt,
            sourceName: "Yahoo Finance Chart",
            sourceUrl: `${YAHOO_FINANCE_URL}/quote/${quote.resolvedSymbol}`,
            dataMode: "delayed",
            isDelayed: true,
            status: "delayed",
          } satisfies LiveQuote;
        } catch (error) {
          const normalized = normalizeProviderError(error, "Yahoo Finance");
          return unavailableQuote(
            symbol,
            "Yahoo Finance Chart",
            normalized.message,
            normalized.code,
          );
        }
      }),
    );
  }
}
