import { describe, expect, it } from "vitest";
import {
  analyzeMarketHistory,
  findSimilarMarketPeriods,
} from "@/lib/analysis/market-patterns";
import { MockRealtimeTaiwanProvider, mockCandles } from "@/lib/market/mock";

describe("歷史市場分析", () => {
  it("以足夠歷史資料產生透明判斷與相似情境", () => {
    const candles = mockCandles("2330", 320);
    const analysis = analyzeMarketHistory("2330", candles);
    expect(["可分批觀察", "等待確認", "禁止進場"]).toContain(analysis.verdict);
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.analogs.length).toBe(5);
    expect(analysis.analogStats.sampleSize).toBeGreaterThan(0);
    expect(analysis.summary).toContain("相似歷史情境");
  });

  it("資料不足時不虛構相似歷史", () => {
    expect(findSimilarMarketPeriods(mockCandles("2317", 100))).toEqual([]);
    expect(() => analyzeMarketHistory("2317", mockCandles("2317", 60))).toThrow(
      "至少需要 80 個交易日",
    );
  });

  it("Mock 行情明確標示來源且未知台股代碼仍可安全追蹤", async () => {
    const provider = new MockRealtimeTaiwanProvider();
    const [quote] = await provider.getQuotes(["9999"]);
    expect(quote.symbol).toBe("9999");
    expect(quote.dataMode).toBe("mock");
    expect(quote.sourceName).toContain("模擬");
    expect(quote.error).toContain("尚未設定");
  });
});
