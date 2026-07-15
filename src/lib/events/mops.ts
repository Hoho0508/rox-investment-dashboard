import { formatInTimeZone } from "date-fns-tz";
import { resolveRuntimeDataMode } from "@/lib/config/data-mode";
import type { DataEnvelope } from "@/types/domain";
import type { InvestorConferenceEvent } from "@/types/research";

const SOURCE_URL = "https://mops.twse.com.tw/mops/web/t100sb02_1";
const API_URL = "https://mopsov.twse.com.tw/mops/web/ajax_t100sb02_1";
const TIME_ZONE = "Asia/Taipei";
const CACHE_TTL_MS = 30 * 60 * 1000;

let cache:
  | { expiresAt: number; envelope: DataEnvelope<InvestorConferenceEvent[]> }
  | undefined;

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function rocDateToIso(value: string) {
  const match = value.match(/^(\d{2,3})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  return `${Number(match[1]) + 1911}-${match[2]}-${match[3]}`;
}

function daysBetween(date: string, today: string) {
  const start = Date.parse(`${today}T00:00:00+08:00`);
  const end = Date.parse(`${date}T00:00:00+08:00`);
  return Math.round((end - start) / 86_400_000);
}

export function parseMopsConferenceHtml(
  html: string,
  market: InvestorConferenceEvent["market"],
  today: string,
): InvestorConferenceEvent[] {
  const rows =
    html.match(/<tr[^>]*data-type=['"]body['"][^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  return rows.flatMap((row) => {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (match) => decodeHtml(match[1]),
    );
    const eventDate = rocDateToIso(cells[2] ?? "");
    if (!eventDate || !/^\d{4,6}$/.test(cells[0] ?? "")) return [];
    return [
      {
        symbol: cells[0],
        companyName: cells[1],
        market,
        eventDate,
        eventTime: cells[3] || null,
        location: cells[4] || null,
        summary: cells[5] || "公司尚未提供法說內容摘要。",
        daysUntil: daysBetween(eventDate, today),
        sourceUrl: SOURCE_URL,
      },
    ];
  });
}

function queryMonths(now: Date, days: number) {
  const end = new Date(now.getTime() + days * 86_400_000);
  let year = Number(formatInTimeZone(now, TIME_ZONE, "yyyy"));
  let month = Number(formatInTimeZone(now, TIME_ZONE, "MM"));
  const endYear = Number(formatInTimeZone(end, TIME_ZONE, "yyyy"));
  const endMonth = Number(formatInTimeZone(end, TIME_ZONE, "MM"));
  const months: Array<{ year: string; month: string }> = [];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      year: String(year - 1911),
      month: String(month).padStart(2, "0"),
    });
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
  }
  return months;
}

async function fetchMonth(
  year: string,
  month: string,
  market: "sii" | "otc",
  fetcher: typeof fetch,
) {
  const body = new URLSearchParams({
    encodeURIComponent: "1",
    step: "1",
    firstin: "1",
    off: "1",
    TYPEK: market,
    year,
    month,
    co_id: "",
  });
  const response = await fetcher(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: SOURCE_URL,
      "User-Agent": "Rox-Investment-Dashboard/1.0",
    },
    body,
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`MOPS_HTTP_${response.status}`);
  return response.text();
}

export async function getUpcomingInvestorConferences(
  options: { now?: Date; days?: number; fetcher?: typeof fetch } = {},
): Promise<DataEnvelope<InvestorConferenceEvent[]>> {
  const now = options.now ?? new Date();
  const days = Math.max(1, Math.min(options.days ?? 30, 90));
  const useCache = !options.fetcher && !options.now && !options.days;
  if (useCache && cache && cache.expiresAt > Date.now()) return cache.envelope;
  const resolution = resolveRuntimeDataMode();
  if (resolution.mode === "mock") {
    return {
      value: null,
      dataMode: "unavailable",
      sourceName: "公開資訊觀測站",
      sourceUrl: SOURCE_URL,
      fetchedAt: now.toISOString(),
      isDelayed: true,
      confidence: 0,
      errorCode: "OFFICIAL_EVENTS_DISABLED_IN_MOCK",
      errorMessage: "Mock 模式不產生模擬法說事件；切換 Live 後讀取官方資料。",
    };
  }

  const today = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
  const results = await Promise.allSettled(
    queryMonths(now, days).flatMap(({ year, month }) =>
      (["sii", "otc"] as const).map(async (market) => ({
        market,
        html: await fetchMonth(year, month, market, options.fetcher ?? fetch),
      })),
    ),
  );
  const succeeded = results.filter(
    (
      result,
    ): result is PromiseFulfilledResult<{
      market: "sii" | "otc";
      html: string;
    }> => result.status === "fulfilled",
  );
  if (succeeded.length === 0) {
    return {
      value: null,
      dataMode: "unavailable",
      sourceName: "公開資訊觀測站",
      sourceUrl: SOURCE_URL,
      fetchedAt: now.toISOString(),
      isDelayed: true,
      confidence: 0,
      errorCode: "MOPS_UNAVAILABLE",
      errorMessage: "目前無法取得官方法說會資料，請稍後再試。",
    };
  }
  const events = succeeded
    .flatMap(({ value }) =>
      parseMopsConferenceHtml(
        value.html,
        value.market === "sii" ? "TWSE" : "TPEx",
        today,
      ),
    )
    .filter((event) => event.daysUntil >= 0 && event.daysUntil <= days)
    .sort(
      (left, right) =>
        left.eventDate.localeCompare(right.eventDate) ||
        (left.eventTime ?? "").localeCompare(right.eventTime ?? ""),
    );
  const partial = succeeded.length !== results.length;
  const envelope: DataEnvelope<InvestorConferenceEvent[]> = {
    value: events,
    dataMode: "delayed",
    sourceName: "公開資訊觀測站／法人說明會一覽表",
    sourceUrl: SOURCE_URL,
    marketDate: today,
    fetchedAt: now.toISOString(),
    lastSuccessfulFetchAt: now.toISOString(),
    isDelayed: true,
    confidence: partial ? 70 : 95,
    ...(partial
      ? {
          errorCode: "PARTIAL_MOPS_DATA",
          errorMessage: "部分市場或月份暫時無法取得，清單可能不完整。",
        }
      : {}),
  };
  if (useCache) cache = { expiresAt: Date.now() + CACHE_TTL_MS, envelope };
  return envelope;
}

export function resetInvestorConferenceCache() {
  cache = undefined;
}
