import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import { unavailableQuote } from "@/lib/market/unavailable";
import { FugleRealtimeTaiwanProvider } from "@/lib/market/fugle";
import { FinMindMarketDataProvider } from "@/lib/providers/finmind";
import {
  createReportMarketProvider,
  resetProviderCachesForTests,
  selectCandleSource,
  StaleAwareRealtimeTaiwanProvider,
} from "@/lib/providers/provider-factory";
import type { LiveQuote } from "@/types/market";

afterEach(() => {
  delete process.env.FINMIND_API_TOKEN;
  delete process.env.FUGLE_MARKETDATA_API_KEY;
  delete process.env.DATA_MODE;
  resetProviderCachesForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("嚴格資料 Provider", () => {
  it("FinMind 沒有 Token 時回 unavailable，不會建構 Mock", async () => {
    const stocks = await new FinMindMarketDataProvider(vi.fn()).getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(tsmc.price.value).toBeNull();
    expect(tsmc.price.dataMode).toBe("unavailable");
    expect(tsmc.price.errorCode).toBe("NOT_CONFIGURED");
    expect(tsmc.price.sourceName).not.toContain("Mock");
  });

  it("FinMind 網路錯誤時回 unavailable，不會回 Mock", async () => {
    process.env.FINMIND_API_TOKEN = "test-only-token";
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const stocks = await new FinMindMarketDataProvider(fetcher).getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(tsmc.price.value).toBeNull();
    expect(tsmc.price.dataMode).toBe("unavailable");
    expect(tsmc.price.errorCode).toBe("PROVIDER_UNAVAILABLE");
    expect(JSON.stringify(tsmc)).not.toContain("test-only-token");
  });

  it("FinMind 成功時標示 delayed 且不混入 Mock 基本面", async () => {
    process.env.FINMIND_API_TOKEN = "test-only-token";
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const symbol = new URL(String(input)).searchParams.get("data_id");
      return Response.json({
        status: 200,
        data: [
          {
            date: "2026-07-14",
            stock_id: symbol,
            close: symbol === "2330" ? 1100 : 200,
            spread: 10,
          },
        ],
      });
    });
    const stocks = await new FinMindMarketDataProvider(fetcher).getCoreStocks();
    const tsmc = stocks.find((stock) => stock.symbol === "2330")!;
    expect(tsmc.price.value).toBe(1100);
    expect(tsmc.price.dataMode).toBe("delayed");
    expect(tsmc.price.isDelayed).toBe(true);
    expect(tsmc.epsGrowth).toBeNull();
    expect(tsmc.forwardPe).toBeNull();
    expect(tsmc.thesisIntact).toBeNull();
    expect(tsmc.majorRisk).toBe("基本面與風險資料尚未提供。");
  });

  it("Mock 模式即使存在 Live Key 仍只使用 Mock Provider", async () => {
    process.env.FINMIND_API_TOKEN = "test-only-token";
    process.env.FUGLE_MARKETDATA_API_KEY = "test-only-fugle-key";
    const provider = createReportMarketProvider({ mode: "mock" });
    const stocks = await provider.getCoreStocks();
    expect(provider.mode).toBe("mock");
    expect(stocks.every((stock) => stock.price.dataMode === "mock")).toBe(true);
  });

  it("Live 模式沒有行情 Key 時使用 Yahoo 真實 K 線，不使用 Mock", () => {
    expect(selectCandleSource("1m", { mode: "live" })).toEqual({
      kind: "yahoo",
    });
    expect(selectCandleSource("1d", { mode: "live" })).toEqual({
      kind: "yahoo",
    });
  });

  it("Fugle 網路失敗時回 unavailable 且不輸出 API Key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const [quote] = await new FugleRealtimeTaiwanProvider(
      "test-only-fugle-key",
    ).getQuotes(["2330"]);
    expect(quote.dataMode).toBe("unavailable");
    expect(quote.price).toBeNull();
    expect(quote.errorCode).toBe("PROVIDER_UNAVAILABLE");
    expect(JSON.stringify(quote)).not.toContain("test-only-fugle-key");
  });

  it("Live Provider 失敗且有舊成功值時回 stale 與最後成功時間", async () => {
    let unavailable = false;
    const fetchedAt = "2026-07-15T01:00:00.000Z";
    const provider: RealtimeTaiwanMarketProvider = {
      async search() {
        return [];
      },
      async getQuotes(symbols) {
        return symbols.map((symbol): LiveQuote => {
          if (unavailable)
            return unavailableQuote(
              symbol,
              "test provider",
              "test provider unavailable",
            );
          return {
            symbol,
            name: "台積電",
            exchange: "TWSE",
            market: "TW",
            price: 1100,
            previousClose: 1090,
            open: 1095,
            high: 1110,
            low: 1085,
            change: 10,
            changePercent: 0.92,
            volume: 1000,
            asOf: fetchedAt,
            fetchedAt,
            lastSuccessfulFetchAt: fetchedAt,
            sourceName: "test provider",
            dataMode: "live",
            isDelayed: false,
            status: "open",
          };
        });
      },
    };
    const wrapped = new StaleAwareRealtimeTaiwanProvider(provider);
    expect((await wrapped.getQuotes(["2330"]))[0].dataMode).toBe("live");
    unavailable = true;
    const [stale] = await wrapped.getQuotes(["2330"]);
    expect(stale.dataMode).toBe("stale");
    expect(stale.price).toBe(1100);
    expect(stale.lastSuccessfulFetchAt).toBe(fetchedAt);
    expect(stale.errorMessage).toContain("unavailable");
  });
});
