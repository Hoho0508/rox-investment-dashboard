import { describe, expect, it } from "vitest";
import {
  generateMorningReport,
  validateScenarioTotal,
} from "@/lib/reports/generate";

describe("晨報生成", () => {
  it("三情境機率合計為 100%", async () =>
    expect(validateScenarioTotal(await generateMorningReport())).toBe(true));
  it("週末產生休市版報告", async () => {
    const report = await generateMorningReport(
      new Date("2026-07-18T01:00:00Z"),
    );
    expect(report.isTradingDay).toBe(false);
    expect(report.conclusion).toContain("休市");
  });
  it("資料來源與時間完整標示", async () => {
    const report = await generateMorningReport();
    expect(
      report.globalMarkets.every(
        (item) =>
          item.price.sourceName &&
          item.price.fetchedAt &&
          item.price.marketDate,
      ),
    ).toBe(true);
  });
  it("Mock 模式明確標示", async () =>
    expect((await generateMorningReport()).dataMode).toBe("mock"));
});
