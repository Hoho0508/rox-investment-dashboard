import { afterEach, describe, expect, it, vi } from "vitest";
import { FinMindMarketDataProvider } from "@/lib/providers/finmind";
import { MockMarketDataProvider } from "@/lib/providers/mock-market";
import type { LiveQuote } from "@/types/market";

afterEach(() => {
  delete process.env.FINMIND_API_TOKEN;
  delete process.env.FUGLE_MARKETDATA_API_KEY;
  delete process.env.DATA_MODE;
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

  it("正式站嚴格模式失敗時不使用 Mock 補值", async () => {
    process.env.DATA_MODE = "live";
    process.env.FINMIND_API_TOKEN = "test-only-token";
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const stocks = await new FinMindMarketDataProvider(
      new MockMarketDataProvider(),
      fetcher,
    ).getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(tsmc.price.value).toBeNull();
    expect(tsmc.price.dataMode).toBe("unavailable");
    expect(tsmc.price.sourceName).not.toContain("Mock");
  });

  it("正式站缺少 FinMind 時使用 Fugle 真實台股報價", async () => {
    process.env.DATA_MODE = "live";
    const getQuotes = vi.fn(async (symbols: string[]) =>
      symbols.map((symbol): LiveQuote => ({
        symbol,
        name: symbol === "2330" ? "台積電" : "鴻海",
        exchange: "TWSE",
        market: "TW",
        price: symbol === "2330" ? 1115 : 205,
        previousClose: null,
        open: null,
        high: null,
        low: null,
        change: null,
        changePercent: symbol === "2330" ? 1.36 : null,
        volume: null,
        asOf: "2026-07-15T05:30:00.000Z",
        sourceName: "Fugle 即時行情",
        sourceUrl: `https://api.fugle.tw/${symbol}`,
        dataMode: "live",
        isDelayed: false,
        status: "open",
      })),
    );
    const stocks = await new FinMindMarketDataProvider(
      new MockMarketDataProvider(),
      vi.fn(),
      { getQuotes },
    ).getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(getQuotes).toHaveBeenCalledWith(["2330", "2317"]);
    expect(tsmc.price.value).toBe(1115);
    expect(tsmc.price.sourceName).toContain("Fugle");
    expect(tsmc.price.dataMode).toBe("live");
    expect(tsmc.epsGrowth).toBeNull();
    expect(stocks.find((stock) => stock.symbol === "NVDA")?.price.value).toBe(
      null,
    );
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
