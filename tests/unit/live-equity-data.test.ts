import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import {
  OfficialTaiwanMarketProvider,
  resetOfficialTaiwanCacheForTests,
} from "@/lib/market/official-taiwan";
import { fetchYahooCandles, fetchYahooFundamentals } from "@/lib/market/yahoo";
import { OfficialEquityMarketProvider } from "@/lib/providers/official-equity-market";
import type { LiveQuote } from "@/types/market";

const chartFixture = (symbol: string, price = 200) => ({
  chart: {
    error: null,
    result: [
      {
        meta: {
          symbol,
          longName: symbol === "NVDA" ? "NVIDIA Corporation" : "台積電",
          regularMarketPrice: price,
          chartPreviousClose: price - 2,
          regularMarketTime: 1_784_053_200,
        },
        timestamp: [1_784_046_000, 1_784_049_600],
        indicators: {
          quote: [
            {
              open: [price - 3, price - 1],
              high: [price, price + 1],
              low: [price - 4, price - 2],
              close: [price - 1, price],
              volume: [1000, 1500],
            },
          ],
        },
      },
    ],
  },
});

function series(type: string, values: number[], dates: string[]) {
  return {
    meta: { symbol: ["TEST"], type: [type] },
    timestamp: dates.map((_, index) => 1_700_000_000 + index * 86_400),
    [type]: values.map((raw, index) => ({
      asOfDate: dates[index],
      periodType: type.startsWith("quarterly") ? "3M" : "12M",
      reportedValue: { raw, fmt: String(raw) },
    })),
  };
}

const quarterlyDates = [
  "2025-04-30",
  "2025-07-31",
  "2025-10-31",
  "2026-01-31",
  "2026-04-30",
];
const annualDates = ["2024-01-31", "2025-01-31", "2026-01-31"];

const fundamentalsFixture = {
  timeseries: {
    error: null,
    result: [
      series(
        "quarterlyTotalRevenue",
        [100, 120, 140, 160, 200],
        quarterlyDates,
      ),
      series("quarterlyDilutedEPS", [1, 1.2, 1.4, 1.6, 2], quarterlyDates),
      series("annualDilutedEPS", [3, 4, 6], annualDates),
      series("annualOperatingCashFlow", [50, 70, 100], annualDates),
      series("annualCapitalExpenditure", [-10, -10, -10], annualDates),
      series("annualTotalRevenue", [100, 150, 200], annualDates),
      series("annualGrossProfit", [30, 45, 60], annualDates),
    ],
  },
};

afterEach(() => resetOfficialTaiwanCacheForTests());

describe("正式股票資料 Adapter", () => {
  it("證交所與櫃買中心提供全市場搜尋及延遲收盤行情", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("openapi.twse.com.tw"))
        return Response.json([
          {
            Date: "1150714",
            Code: "2330",
            Name: "台積電",
            TradeVolume: "1000",
            OpeningPrice: "198",
            HighestPrice: "202",
            LowestPrice: "197",
            ClosingPrice: "200",
            Change: "+2",
          },
        ]);
      return Response.json([
        {
          Date: "1150715",
          SecuritiesCompanyCode: "6488",
          CompanyName: "環球晶",
          Close: "400",
          Change: "-2",
          Open: "405",
          High: "408",
          Low: "398",
          TradingShares: "2000",
        },
      ]);
    }) as unknown as typeof fetch;
    const provider = new OfficialTaiwanMarketProvider(fetcher);

    expect(await provider.search("環球晶")).toEqual([
      {
        symbol: "6488",
        name: "環球晶",
        exchange: "TPEx",
        market: "TW",
      },
    ]);
    const quotes = await provider.getQuotes(["2330", "6488"]);
    expect(quotes.map((quote) => quote.price)).toEqual([200, 400]);
    expect(quotes.every((quote) => quote.dataMode === "delayed")).toBe(true);
    expect(quotes.every((quote) => !quote.sourceName.includes("Mock"))).toBe(
      true,
    );
  });

  it("Yahoo 提供真實 K 線與可計算的歷史基本面，不填造預估本益比", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) =>
      String(input).includes("/chart/")
        ? Response.json(chartFixture("NVDA", 200))
        : Response.json(fundamentalsFixture),
    ) as unknown as typeof fetch;

    const candles = await fetchYahooCandles("NVDA", "1m", 320, fetcher);
    const fundamentals = await fetchYahooFundamentals("NVDA", 200, fetcher);

    expect(candles.candles).toHaveLength(2);
    expect(fundamentals.values.revenueGrowth).toBe(100);
    expect(fundamentals.values.epsGrowth).toBe(100);
    expect(fundamentals.values.freeCashFlow).toBe(90);
    expect(fundamentals.values.freeCashFlowTrend).toBe(50);
    expect(fundamentals.values.trailingPe).toBeCloseTo(200 / 6.2);
    expect(fundamentals.values.forwardPe).toBeNull();
  });

  it("季度 EPS 不足五期時使用年度 EPS 年增率，不捏造缺少的季度", async () => {
    const onlyFourQuarters = {
      timeseries: {
        error: null,
        result: fundamentalsFixture.timeseries.result.map((entry) =>
          entry.meta.type.includes("quarterlyDilutedEPS")
            ? series(
                "quarterlyDilutedEPS",
                [1.2, 1.4, 1.6, 2],
                quarterlyDates.slice(1),
              )
            : entry,
        ),
      },
    };
    const fetcher = vi.fn(async () =>
      Response.json(onlyFourQuarters),
    ) as unknown as typeof fetch;

    const fundamentals = await fetchYahooFundamentals("2317", 100, fetcher);

    expect(fundamentals.values.epsGrowth).toBe(50);
  });

  it("報告核心股票合併即時行情、TWSE 基本面及 Yahoo 歷史資料", async () => {
    const taiwanProvider: RealtimeTaiwanMarketProvider = {
      async search() {
        return [];
      },
      async getQuotes(symbols) {
        return symbols.map((symbol): LiveQuote => ({
          symbol,
          name: symbol === "2330" ? "台積電" : "鴻海",
          exchange: "TWSE",
          market: "TW",
          price: symbol === "2330" ? 200 : 100,
          previousClose: symbol === "2330" ? 198 : 99,
          open: null,
          high: null,
          low: null,
          change: symbol === "2330" ? 2 : 1,
          changePercent: symbol === "2330" ? 1.01 : 1.01,
          volume: null,
          asOf: "2026-07-15T05:30:00.000Z",
          fetchedAt: "2026-07-15T05:31:00.000Z",
          sourceName: "Fugle 即時行情",
          dataMode: "live",
          isDelayed: false,
          status: "open",
        }));
      },
    };
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("t187ap05_L"))
        return Response.json([
          {
            出表日期: "1150715",
            資料年月: "11506",
            公司代號: "2330",
            公司名稱: "台積電",
            "營業收入-去年同月增減(%)": "20",
          },
          {
            出表日期: "1150715",
            資料年月: "11506",
            公司代號: "2317",
            公司名稱: "鴻海",
            "營業收入-去年同月增減(%)": "10",
          },
        ]);
      if (url.includes("t187ap06_L_ci"))
        return Response.json([
          {
            出表日期: "1150715",
            年度: "115",
            季別: "1",
            公司代號: "2330",
            公司名稱: "台積電",
            "基本每股盈餘（元）": "12",
          },
          {
            出表日期: "1150715",
            年度: "115",
            季別: "1",
            公司代號: "2317",
            公司名稱: "鴻海",
            "基本每股盈餘（元）": "4",
          },
        ]);
      if (url.includes("t187ap17_L"))
        return Response.json([
          {
            出表日期: "1150715",
            年度: "115",
            季別: "1",
            公司代號: "2330",
            公司名稱: "台積電",
            "毛利率(%)(營業毛利)/(營業收入)": "55",
          },
          {
            出表日期: "1150715",
            年度: "115",
            季別: "1",
            公司代號: "2317",
            公司名稱: "鴻海",
            "毛利率(%)(營業毛利)/(營業收入)": "6",
          },
        ]);
      if (url.includes("BWIBBU_ALL"))
        return Response.json([
          { Date: "1150715", Code: "2330", Name: "台積電", PEratio: "20" },
          { Date: "1150715", Code: "2317", Name: "鴻海", PEratio: "15" },
        ]);
      if (url.includes("/chart/NVDA"))
        return Response.json(chartFixture("NVDA", 200));
      return Response.json(fundamentalsFixture);
    }) as unknown as typeof fetch;

    const stocks = await new OfficialEquityMarketProvider(
      taiwanProvider,
      fetcher,
    ).getCoreStocks();

    expect(stocks.map((stock) => stock.price.value)).toEqual([200, 200, 100]);
    expect(stocks.find((stock) => stock.symbol === "2330")?.revenueGrowth).toBe(
      20,
    );
    expect(
      stocks.find((stock) => stock.symbol === "2330")?.fundamentals?.value
        ?.epsGrowth,
    ).toBe(100);
    expect(
      stocks.find((stock) => stock.symbol === "NVDA")?.fundamentals?.value
        ?.freeCashFlow,
    ).toBe(90);
    expect(stocks.every((stock) => stock.forwardPe === null)).toBe(true);
    expect(JSON.stringify(stocks)).not.toContain("Mock");
  });
});
