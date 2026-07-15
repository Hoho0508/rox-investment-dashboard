import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getUpcomingInvestorConferences,
  parseMopsConferenceHtml,
  resetInvestorConferenceCache,
} from "@/lib/events/mops";
import { buildBeginnerDecision } from "@/lib/research/beginner";
import {
  resolveLibraryStocks,
  STOCK_LIBRARIES,
} from "@/lib/research/stock-library";
import type { ReportStock } from "@/types/research";

const mopsFixture = `
  <table><tr class='even' data-type='body'>
    <td>2330</td><td>台積電</td><td>115/07/16</td><td>14:00</td>
    <td>台北文華東方酒店</td>
    <td>(1)公布本公司2026年第2季財務報告及2026年第3季業績展望<br>(2)相關資訊依規定揭露</td>
  </tr></table>`;

const stock: ReportStock = {
  symbol: "2330",
  name: "台積電",
  market: "TW",
  price: {
    value: 1000,
    dataMode: "delayed",
    sourceName: "TWSE",
    marketDate: "2026-07-15",
    fetchedAt: "2026-07-15T01:00:00.000Z",
    isDelayed: true,
    confidence: 85,
  },
  dayChangePercent: 1,
  revenueGrowth: 20,
  epsGrowth: 18,
  grossMarginTrend: 2,
  freeCashFlowTrend: 10,
  forwardPe: null,
  outlook: "穩定",
  thesisIntact: true,
  majorRisk: "需求不如預期",
  nextEvent: "",
  entry: {
    score: 70,
    confidence: 82,
    label: "適合研究",
    supporting: ["投資理由仍成立"],
    opposing: [],
    missing: ["預估本益比"],
    biggestRisk: "需求不如預期",
    raiseConditions: ["財報持續支持成長"],
    lowerConditions: ["公司下修展望"],
  },
  exit: {
    score: 20,
    confidence: 80,
    label: "持續追蹤",
    supporting: [],
    opposing: [],
    missing: [],
    biggestRisk: "需求不如預期",
    raiseConditions: [],
    lowerConditions: [],
  },
};

describe("新手研究中心", () => {
  afterEach(() => {
    delete process.env.DATA_MODE;
    resetInvestorConferenceCache();
    vi.restoreAllMocks();
  });

  it("解析 MOPS 民國日期、公司與法說摘要", () => {
    const events = parseMopsConferenceHtml(mopsFixture, "TWSE", "2026-07-15");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      symbol: "2330",
      eventDate: "2026-07-16",
      eventTime: "14:00",
      daysUntil: 1,
      market: "TWSE",
    });
    expect(events[0].summary).toContain("第2季財務報告");
  });

  it("官方來源失敗時回 unavailable，不產生模擬法說", async () => {
    process.env.DATA_MODE = "live";
    const result = await getUpcomingInvestorConferences({
      now: new Date("2026-07-15T01:00:00Z"),
      days: 10,
      fetcher: vi.fn().mockRejectedValue(new Error("network down")),
    });
    expect(result.dataMode).toBe("unavailable");
    expect(result.value).toBeNull();
    expect(result.sourceName).not.toContain("Mock");
  });

  it("Mock 模式明確停用官方事件，不捏造日期", async () => {
    process.env.DATA_MODE = "mock";
    const result = await getUpcomingInvestorConferences({
      now: new Date("2026-07-15T01:00:00Z"),
      fetcher: vi.fn(),
    });
    expect(result.value).toBeNull();
    expect(result.errorCode).toBe("OFFICIAL_EVENTS_DISABLED_IN_MOCK");
  });

  it("法說在兩天內時優先提醒觀察，並降低信心", () => {
    const event = parseMopsConferenceHtml(mopsFixture, "TWSE", "2026-07-15")[0];
    const decision = buildBeginnerDecision(stock, event);
    expect(decision.verdict).toBe("法說前先觀察");
    expect(decision.confidence).toBeLessThanOrEqual(55);
    expect(decision.opposing.join(" ")).toContain("距離法說會剩 1 天");
    expect(decision.summary).not.toMatch(/買進|賣出/);
  });

  it("資料與證據充足時只建議開始研究，不給買賣指令", () => {
    const decision = buildBeginnerDecision(stock);
    expect(decision.verdict).toBe("適合開始研究");
    expect(decision.supporting.join(" ")).toContain("營收年增");
    expect(JSON.stringify(decision)).not.toMatch(/買進|賣出/);
  });

  it("四個股票倉庫各有十檔，且只解析可信任代碼", () => {
    expect(STOCK_LIBRARIES).toHaveLength(4);
    for (const library of STOCK_LIBRARIES) {
      expect(library.stocks).toHaveLength(10);
      expect(new Set(library.stocks.map((item) => item.symbol)).size).toBe(10);
    }
    expect(resolveLibraryStocks(["2330", "2330", "NOT-A-STOCK"])).toEqual([
      expect.objectContaining({ symbol: "2330", name: "台積電" }),
    ]);
  });
});
