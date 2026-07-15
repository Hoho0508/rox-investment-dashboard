import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeMarketHistory,
  findSimilarMarketPeriods,
} from "@/lib/analysis/market-patterns";
import { FinMindDelayedTaiwanProvider } from "@/lib/market/finmind-market";
import { MockRealtimeTaiwanProvider, mockCandles } from "@/lib/market/mock";

describe("歷史市場分析", () => {
  afterEach(() => vi.unstubAllGlobals());
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

  it("沒有盤中金鑰時以 FinMind 最新收盤價取代錯誤 Mock 價格", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | RequestInfo) => {
        const url = new URL(String(input));
        if (url.searchParams.get("dataset") === "TaiwanStockInfo")
          return Response.json({
            status: 200,
            data: [
              {
                stock_id: "2330",
                stock_name: "台積電",
                type: "twse",
              },
            ],
          });
        return Response.json({
          status: 200,
          data: [
            {
              date: "2026-07-13",
              open: 1000,
              max: 1030,
              min: 990,
              close: 1010,
              Trading_Volume: 10_000,
            },
            {
              date: "2026-07-14",
              open: 1020,
              max: 1040,
              min: 1010,
              close: 1030,
              Trading_Volume: 12_000,
            },
          ],
        });
      }),
    );
    const [quote] = await new FinMindDelayedTaiwanProvider().getQuotes([
      "2330",
    ]);
    expect(quote.price).toBe(1030);
    expect(quote.previousClose).toBe(1010);
    expect(quote.dataMode).toBe("live");
    expect(quote.isDelayed).toBe(true);
    expect(quote.sourceName).toContain("FinMind");
  });
});
