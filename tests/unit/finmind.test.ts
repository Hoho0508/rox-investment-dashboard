import { afterEach, describe, expect, it, vi } from "vitest";
import { FinMindMarketDataProvider } from "@/lib/providers/finmind";
import { MockMarketDataProvider } from "@/lib/providers/mock-market";

afterEach(() => {
  delete process.env.FINMIND_API_TOKEN;
  vi.restoreAllMocks();
});

describe("FinMind 台股 Provider", () => {
  it("沒有 Token 時自動降級 Mock 且留下原因", async () => {
    const provider = new FinMindMarketDataProvider(
      new MockMarketDataProvider(),
      vi.fn(),
    );
    const stocks = await provider.getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(tsmc.price.dataMode).toBe("mock");
    expect(tsmc.price.error).toContain("FINMIND_API_TOKEN");
  });

  it("FinMind 失敗時不拋錯並降級 Mock", async () => {
    process.env.FINMIND_API_TOKEN = "test-only-token";
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const stocks = await new FinMindMarketDataProvider(
      new MockMarketDataProvider(),
      fetcher,
    ).getCoreStocks();
    expect(
      stocks.find((stock) => stock.symbol === "2330")?.price.error,
    ).toContain("network down");
  });

  it("成功時使用 FinMind 價格且不混入 Mock 基本面", async () => {
    process.env.FINMIND_API_TOKEN = "test-only-token";
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 200,
          msg: "success",
          data: [
            { date: "2026-07-14", stock_id: "2330", close: 1100, spread: 10 },
          ],
        }),
        { status: 200 },
      ),
    );
    const stocks = await new FinMindMarketDataProvider(
      new MockMarketDataProvider(),
      fetcher,
    ).getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(tsmc.price.sourceName).toContain("FinMind");
    expect(tsmc.price.value).toBe(1100);
    expect(tsmc.epsGrowth).toBeNull();
  });
});
