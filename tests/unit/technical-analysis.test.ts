import { afterEach, describe, expect, it } from "vitest";
import { buildMarketPulse } from "@/lib/intelligence/market-pulse";
import { getTaiwanCandleSeries } from "@/lib/market";
import { mockCandles } from "@/lib/market/mock";
import { generateMorningReport } from "@/lib/reports/generate";
import { analyzeTechnicalSeries } from "@/lib/technical/analyze";
import {
  bollingerBands,
  exponentialMovingAverage,
  relativeStrengthIndex,
  simpleMovingAverage,
} from "@/lib/technical/indicators";

describe("V2 技術分析中心", () => {
  const originalFugleKey = process.env.FUGLE_MARKETDATA_API_KEY;

  afterEach(() => {
    if (originalFugleKey === undefined)
      delete process.env.FUGLE_MARKETDATA_API_KEY;
    else process.env.FUGLE_MARKETDATA_API_KEY = originalFugleKey;
  });

  it("正確計算基本趨勢、動能與波動指標", () => {
    const values = Array.from({ length: 60 }, (_, index) => index + 1);
    expect(simpleMovingAverage(values, 5)).toBe(58);
    expect(exponentialMovingAverage(values, 20)).toBeGreaterThan(49);
    expect(relativeStrengthIndex(values)).toBe(100);
    const bands = bollingerBands(values);
    expect(bands.upper).toBeGreaterThan(bands.middle!);
    expect(bands.lower).toBeLessThan(bands.middle!);
  });

  it("1 分鐘 K 沒有 Fugle Key 時明確使用 Mock，不冒充即時", async () => {
    delete process.env.FUGLE_MARKETDATA_API_KEY;
    const series = await getTaiwanCandleSeries("2330", "1m");
    expect(series.interval).toBe("1m");
    expect(series.candles.length).toBe(270);
    expect(series.dataMode).toBe("mock");
    expect(series.supportsLive).toBe(false);
    expect(series.error).toContain("FUGLE_MARKETDATA_API_KEY");
  });

  it("技術評分固定輸出證據、風險、失效條件與研究用語", () => {
    const candles = mockCandles("2330", 320);
    const analysis = analyzeTechnicalSeries({
      symbol: "2330",
      interval: "1d",
      candles,
      sourceName: "unit fixture",
      dataMode: "mock",
      isDelayed: true,
      supportsLive: false,
      asOf: candles.at(-1)!.time,
    });
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(["適合開始研究", "等待突破", "等待回測", "風險增加"]).toContain(
      analysis.verdict,
    );
    expect(
      analysis.supportingEvidence.length + analysis.opposingEvidence.length,
    ).toBeGreaterThan(0);
    expect(analysis.biggestRisk.length).toBeGreaterThan(0);
    expect(analysis.invalidation).toContain("重新評估");
    expect(analysis.zones).toHaveLength(4);
  });

  it("市場脈動在 Mock 模式清楚標示示範，不捏造真實新聞", async () => {
    const pulse = buildMarketPulse(await generateMorningReport());
    expect(pulse.sentiment.score).toBeGreaterThanOrEqual(0);
    expect(pulse.sentiment.score).toBeLessThanOrEqual(100);
    if (pulse.dataMode === "mock") {
      expect(pulse.warning).toContain("示範");
      expect(pulse.narrative).toContain("待新聞");
    }
  });
});
