import { z } from "zod";
import { unavailableEnvelope } from "@/lib/providers/envelopes";
import {
  normalizeProviderError,
  ProviderError,
  providerHttpError,
} from "@/lib/providers/errors";
import type { MarketQuote } from "@/types/domain";

const TWSE_INDEX_URL = "https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX";
const TREASURY_YIELD_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml";

const twseIndexSchema = z.array(
  z.object({
    日期: z.string(),
    指數: z.string(),
    收盤指數: z.string(),
    漲跌百分比: z.string(),
  }),
);

const TWSE_SERIES = [
  {
    symbol: "TAIEX",
    name: "臺灣加權指數",
    sourceName: "臺灣證券交易所 OpenAPI / 發行量加權股價指數",
    indexName: "發行量加權股價指數",
    impactLabel: "台股大盤",
  },
  {
    symbol: "TW50",
    name: "臺灣 50 指數",
    sourceName: "臺灣證券交易所 OpenAPI / 臺灣50指數",
    indexName: "臺灣50指數",
    impactLabel: "大型權值股",
  },
  {
    symbol: "TWTECH",
    name: "臺灣資訊科技指數",
    sourceName: "臺灣證券交易所 OpenAPI / 臺灣資訊科技指數",
    indexName: "臺灣資訊科技指數",
    impactLabel: "科技權值股",
  },
] as const;

const TREASURY_SERIES = [
  {
    symbol: "US2Y",
    name: "美國 2 年期公債殖利率",
    tag: "BC_2YEAR",
    impactLabel: "短端利率",
  },
  {
    symbol: "US10Y",
    name: "美國 10 年期公債殖利率",
    tag: "BC_10YEAR",
    impactLabel: "長端利率",
  },
] as const;

type TreasuryObservation = {
  date: string;
  US2Y: number;
  US10Y: number;
};

function parseNumber(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(parsed))
    throw new ProviderError("INVALID_RESPONSE", "市場資料包含非數字欄位。");
  return parsed;
}

export function rocDateToIso(value: string) {
  const match = /^(\d{3})(\d{2})(\d{2})$/.exec(value);
  if (!match)
    throw new ProviderError("INVALID_MARKET_DATE", "TWSE 日期格式不正確。");
  const year = Number(match[1]) + 1911;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new ProviderError("INVALID_MARKET_DATE", "TWSE 日期內容不正確。");
  return `${year}-${match[2]}-${match[3]}`;
}

function envelope(
  value: number,
  sourceName: string,
  sourceUrl: string,
  marketDate: string,
  fetchedAt: string,
) {
  return {
    value,
    dataMode: "delayed" as const,
    sourceName,
    sourceUrl,
    marketDate,
    fetchedAt,
    lastSuccessfulFetchAt: fetchedAt,
    isDelayed: true,
    confidence: 94,
  };
}

function directionImpact(label: string, changePercent: number) {
  if (changePercent > 0)
    return `${label}最近交易日上漲 ${changePercent.toFixed(2)}%。`;
  if (changePercent < 0)
    return `${label}最近交易日下跌 ${Math.abs(changePercent).toFixed(2)}%。`;
  return `${label}最近交易日持平。`;
}

function tagValue(block: string, tag: string) {
  const match = new RegExp(`<d:${tag}(?:\\s[^>]*)?>([^<]+)</d:${tag}>`).exec(
    block,
  );
  return match?.[1];
}

export function parseTreasuryYieldXml(xml: string): TreasuryObservation[] {
  const blocks = xml.match(/<m:properties>[\s\S]*?<\/m:properties>/g) ?? [];
  const observations = blocks.flatMap((block) => {
    const rawDate = tagValue(block, "NEW_DATE")?.slice(0, 10);
    const rawTwoYear = tagValue(block, "BC_2YEAR");
    const rawTenYear = tagValue(block, "BC_10YEAR");
    if (!rawDate || !rawTwoYear || !rawTenYear) return [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return [];
    const US2Y = parseNumber(rawTwoYear);
    const US10Y = parseNumber(rawTenYear);
    if (US2Y <= 0 || US10Y <= 0) return [];
    return [{ date: rawDate, US2Y, US10Y }];
  });
  return observations.sort((a, b) => a.date.localeCompare(b.date));
}

function unavailableRows(
  source: "twse" | "treasury",
  error: ProviderError,
): MarketQuote[] {
  const definitions = source === "twse" ? TWSE_SERIES : TREASURY_SERIES;
  const sourceName =
    source === "twse"
      ? "臺灣證券交易所 OpenAPI"
      : "U.S. Treasury / Daily Treasury Par Yield Curve Rates";
  return definitions.map((item) => ({
    symbol: item.symbol,
    name: item.name,
    unit: source === "twse" ? "點" : "%",
    price: unavailableEnvelope<number>(sourceName, error),
    changePercent: unavailableEnvelope<number>(sourceName, error),
    impact: `${item.name}目前 unavailable。`,
  }));
}

export class OfficialGlobalMarketProvider {
  readonly mode = "delayed" as const;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getGlobalMarkets(): Promise<MarketQuote[]> {
    const [twse, treasury] = await Promise.allSettled([
      this.fetchTwseIndices(),
      this.fetchTreasuryYields(),
    ]);
    return [
      ...(twse.status === "fulfilled"
        ? twse.value
        : unavailableRows(
            "twse",
            normalizeProviderError(twse.reason, "臺灣證券交易所 OpenAPI"),
          )),
      ...(treasury.status === "fulfilled"
        ? treasury.value
        : unavailableRows(
            "treasury",
            normalizeProviderError(treasury.reason, "U.S. Treasury"),
          )),
    ];
  }

  private async fetchTwseIndices(): Promise<MarketQuote[]> {
    const response = await this.fetcher(TWSE_INDEX_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok)
      throw providerHttpError("臺灣證券交易所 OpenAPI", response.status);
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ProviderError(
        "INVALID_RESPONSE",
        "臺灣證券交易所回傳無法解析的資料。",
      );
    }
    const parsed = twseIndexSchema.safeParse(json);
    if (!parsed.success)
      throw new ProviderError(
        "INVALID_RESPONSE",
        "臺灣證券交易所回傳格式不正確。",
      );
    const fetchedAt = this.now().toISOString();
    return TWSE_SERIES.map((definition) => {
      const row = parsed.data.find(
        (candidate) => candidate.指數 === definition.indexName,
      );
      if (!row)
        throw new ProviderError(
          "EMPTY_DATA",
          `臺灣證券交易所查無${definition.name}。`,
        );
      const price = parseNumber(row.收盤指數);
      const changePercent = parseNumber(row.漲跌百分比);
      if (price <= 0)
        throw new ProviderError(
          "INVALID_RESPONSE",
          `${definition.name}數值不正確。`,
        );
      const marketDate = rocDateToIso(row.日期);
      return {
        symbol: definition.symbol,
        name: definition.name,
        unit: "點",
        price: envelope(
          price,
          definition.sourceName,
          TWSE_INDEX_URL,
          marketDate,
          fetchedAt,
        ),
        changePercent: envelope(
          changePercent,
          definition.sourceName,
          TWSE_INDEX_URL,
          marketDate,
          fetchedAt,
        ),
        impact: directionImpact(definition.impactLabel, changePercent),
      };
    });
  }

  private async fetchTreasuryYields(): Promise<MarketQuote[]> {
    const year = this.now().getUTCFullYear();
    const url = `${TREASURY_YIELD_URL}?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
    const response = await this.fetcher(url, {
      headers: { Accept: "application/atom+xml, application/xml" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) throw providerHttpError("U.S. Treasury", response.status);
    const observations = parseTreasuryYieldXml(await response.text());
    const latest = observations.at(-1);
    const previous = observations.at(-2);
    if (!latest || !previous)
      throw new ProviderError(
        "EMPTY_DATA",
        "U.S. Treasury 查無足夠的近期殖利率資料。",
      );
    const fetchedAt = this.now().toISOString();
    const sourceName = "U.S. Treasury / Daily Treasury Par Yield Curve Rates";
    return TREASURY_SERIES.map((definition) => {
      const current = latest[definition.symbol];
      const prior = previous[definition.symbol];
      const changePercent = ((current - prior) / prior) * 100;
      return {
        symbol: definition.symbol,
        name: definition.name,
        unit: "%",
        price: envelope(current, sourceName, url, latest.date, fetchedAt),
        changePercent: envelope(
          changePercent,
          sourceName,
          url,
          latest.date,
          fetchedAt,
        ),
        impact: directionImpact(definition.impactLabel, changePercent),
      };
    });
  }
}
