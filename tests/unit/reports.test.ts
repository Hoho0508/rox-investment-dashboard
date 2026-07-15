import { afterEach, describe, expect, it } from "vitest";
import {
  generateReport,
  generateMorningReport,
  validateScenarioTotal,
} from "@/lib/reports/generate";
import { REPORT_DEFINITIONS, parseReportType } from "@/lib/reports/config";

describe("晨報生成", () => {
  afterEach(() => {
    delete process.env.DATA_MODE;
    delete process.env.FINMIND_API_TOKEN;
    delete process.env.FUGLE_MARKETDATA_API_KEY;
  });
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

  it("本機缺少 Live 金鑰時仍可用 Mock 完成報告介面", async () => {
    const report = await generateMorningReport();
    expect(report.scenarioModelAvailable).toBe(true);
    expect(report.marketView).toBe("震盪");
    expect(report.stocks.every((stock) => stock.price.value !== null)).toBe(
      true,
    );
  });

  it("晨報、午盤與盤後使用相同契約且內容依時段調整", async () => {
    const [morning, midday, close] = await Promise.all([
      generateReport("morning"),
      generateReport("midday"),
      generateReport("close"),
    ]);
    expect(morning.reportType).toBe("morning");
    expect(midday.reportType).toBe("midday");
    expect(midday.conclusion).toContain("午盤");
    expect(close.reportType).toBe("close");
    expect(close.conclusion).toContain("盤後");
    expect([morning, midday, close].every(validateScenarioTotal)).toBe(true);
  });

  it("報告設定保留台灣時間且未知類型安全回晨報", () => {
    expect(REPORT_DEFINITIONS.midday.taipeiTime).toBe("12:30");
    expect(REPORT_DEFINITIONS.close.taipeiTime).toBe("15:00");
    expect(parseReportType("unexpected")).toBe("morning");
  });

  it("正式 Live 模式不把 Mock 補進報告", async () => {
    process.env.DATA_MODE = "live";
    const report = await generateReport("close");
    expect(report.dataMode).toBe("unavailable");
    expect(report.globalMarkets).toEqual([]);
    expect(report.stocks.every((stock) => stock.price.value === null)).toBe(
      true,
    );
    expect(
      report.stocks.every((stock) => !stock.price.sourceName.includes("Mock")),
    ).toBe(true);
    expect(report.scenarioModelAvailable).toBe(false);
    expect(report.marketView).toBe("資料不足");
    expect(report.volatility).toBe("未知");
    expect(report.confidence).toBe(0);
    expect(report.conclusion).toContain("目前資料不足");
    expect(report.conclusion).not.toContain("科技股情緒偏弱");
    expect(validateScenarioTotal(report)).toBe(true);
  });
});
