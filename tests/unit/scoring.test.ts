import { describe, expect, it } from "vitest";
import { calculateEntryScore } from "@/lib/scoring/entry";
import { calculateExitWarning } from "@/lib/scoring/exit";
import type { StockSnapshot } from "@/types/domain";

const stock = (overrides: Partial<StockSnapshot> = {}): StockSnapshot => ({
  symbol: "TEST",
  name: "測試公司",
  market: "US",
  price: {
    value: 100,
    sourceName: "test",
    fetchedAt: new Date().toISOString(),
    marketDate: "2026-01-01",
    isDelayed: true,
    dataMode: "mock",
    confidence: 100,
  },
  dayChangePercent: 0,
  revenueGrowth: 20,
  epsGrowth: 25,
  grossMarginTrend: 1,
  freeCashFlowTrend: 20,
  forwardPe: 18,
  outlook: "穩定",
  thesisIntact: true,
  majorRisk: "需求波動",
  nextEvent: "財報",
  ...overrides,
});

describe("進場準備度", () => {
  it("基本面強且估值合理時分數提高", () =>
    expect(calculateEntryScore(stock()).score).toBeGreaterThanOrEqual(65));
  it("股價大跌但基本面惡化時不會得到高分", () =>
    expect(
      calculateEntryScore(
        stock({
          dayChangePercent: -20,
          revenueGrowth: -20,
          epsGrowth: -30,
          freeCashFlowTrend: -25,
          outlook: "下修",
          thesisIntact: false,
        }),
      ).score,
    ).toBeLessThan(50));
  it("單日大跌不會單獨提高進場分數", () =>
    expect(calculateEntryScore(stock({ dayChangePercent: -20 })).score).toBe(
      calculateEntryScore(stock({ dayChangePercent: 0 })).score,
    ));
  it("自由現金流惡化會降低分數", () =>
    expect(
      calculateEntryScore(stock({ freeCashFlowTrend: -30 })).score,
    ).toBeLessThan(calculateEntryScore(stock()).score));
  it("缺少關鍵資料會顯示資料不足並限制分數", () => {
    const result = calculateEntryScore(
      stock({ epsGrowth: null, revenueGrowth: null, freeCashFlowTrend: null }),
    );
    expect(result.missing.length).toBeGreaterThan(1);
    expect(result.score).toBeLessThanOrEqual(64);
  });
  it("持股集中度過高時降低風險管理得分", () =>
    expect(calculateEntryScore(stock(), 60).score).toBeLessThan(
      calculateEntryScore(stock(), 10).score,
    ));
});

describe("出場警示", () => {
  it("單日大漲或大跌不會單獨觸發出場", () =>
    expect(calculateExitWarning(stock({ dayChangePercent: 20 })).score).toBe(
      calculateExitWarning(stock({ dayChangePercent: -20 })).score,
    ));
  it("公司下修展望時警示提高", () =>
    expect(
      calculateExitWarning(stock({ outlook: "下修" })).score,
    ).toBeGreaterThan(calculateExitWarning(stock()).score));
  it("高集中度提高警示", () =>
    expect(calculateExitWarning(stock(), 60).score).toBeGreaterThan(
      calculateExitWarning(stock(), 10).score,
    ));
});
