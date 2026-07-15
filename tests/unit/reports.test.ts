import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateReport,
  generateMorningReport,
  validateScenarioTotal,
} from "@/lib/reports/generate";
import { REPORT_DEFINITIONS, parseReportType } from "@/lib/reports/config";
import { sanitizeReportForDataAvailability } from "@/lib/reports/safety";
import { assertReportCanBeStored } from "@/lib/reports/store";

describe("晨報生成", () => {
  afterEach(() => {
    delete process.env.DATA_MODE;
    delete process.env.FINMIND_API_TOKEN;
    delete process.env.FUGLE_MARKETDATA_API_KEY;
    vi.unstubAllGlobals();
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("official provider unavailable")),
    );
    const report = await generateReport("close");
    expect(report.dataMode).toBe("unavailable");
    expect(report.globalMarkets).toHaveLength(5);
    expect(
      report.globalMarkets.every((market) => market.price.value === null),
    ).toBe(true);
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

  it("官方市場資料完整時不再將整份報告標成資料不足", async () => {
    process.env.DATA_MODE = "live";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("openapi.twse.com.tw"))
          return new Response(
            JSON.stringify([
              {
                日期: "1150714",
                指數: "發行量加權股價指數",
                收盤指數: "44,737.95",
                漲跌百分比: "-1.42",
              },
              {
                日期: "1150714",
                指數: "臺灣50指數",
                收盤指數: "41,455.31",
                漲跌百分比: "-1.36",
              },
              {
                日期: "1150714",
                指數: "臺灣資訊科技指數",
                收盤指數: "87,232.06",
                漲跌百分比: "-1.50",
              },
            ]),
            { status: 200 },
          );
        return new Response(
          `<feed>
            <entry><content><m:properties>
              <d:NEW_DATE>2026-07-13T00:00:00</d:NEW_DATE>
              <d:BC_2YEAR>4.18</d:BC_2YEAR><d:BC_10YEAR>4.53</d:BC_10YEAR>
            </m:properties></content></entry>
            <entry><content><m:properties>
              <d:NEW_DATE>2026-07-14T00:00:00</d:NEW_DATE>
              <d:BC_2YEAR>4.21</d:BC_2YEAR><d:BC_10YEAR>4.56</d:BC_10YEAR>
            </m:properties></content></entry>
          </feed>`,
          { status: 200 },
        );
      }),
    );

    const report = await generateMorningReport(
      new Date("2026-07-15T01:00:00Z"),
    );

    expect(report.dataMode).toBe("delayed");
    expect(report.scenarioModelAvailable).toBe(true);
    expect(report.marketView).toBe("中性偏空");
    expect(report.confidence).toBeGreaterThan(0);
    expect(report.conclusion).toContain("臺灣加權指數");
    expect(report.conclusion).not.toContain("目前資料不足");
    expect(
      report.globalMarkets.every((item) => item.price.value !== null),
    ).toBe(true);
  });

  it("Live 模式拒絕儲存任何含 Mock lineage 的報告", async () => {
    const report = await generateMorningReport();
    expect(report.dataMode).toBe("mock");
    expect(() => assertReportCanBeStored(report, { mode: "live" })).toThrow(
      "拒絕儲存 Mock 報告",
    );
  });

  it("讀取舊報告時會移除資料不足卻仍存在的推測敘事", async () => {
    const oldReport = await generateMorningReport();
    const sanitized = sanitizeReportForDataAvailability({
      ...oldReport,
      dataMode: "unavailable",
      globalMarkets: [],
      scenarioModelAvailable: false,
      marketView: "震盪",
      confidence: 68,
      volatility: "中",
      conclusion: "科技股情緒偏弱、殖利率上升，台股較可能震盪。",
    });
    expect(sanitized.marketView).toBe("資料不足");
    expect(sanitized.confidence).toBe(0);
    expect(sanitized.volatility).toBe("未知");
    expect(sanitized.conclusion).toContain("目前資料不足");
    expect(sanitized.conclusion).not.toContain("科技股情緒偏弱");
    expect(
      sanitized.scenarios.every((scenario) =>
        scenario.trigger.includes("資料不足"),
      ),
    ).toBe(true);
    expect(validateScenarioTotal(sanitized)).toBe(true);
  });
});
