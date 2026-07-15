import type { MarketDataProvider } from "@/lib/providers/contracts";
import type { DataPoint, MarketQuote, StockSnapshot } from "@/types/domain";

const now = () => new Date().toISOString();
const point = <T>(value: T, marketDate: string): DataPoint<T> => ({
  value,
  sourceName: "Rox Mock Dataset",
  fetchedAt: now(),
  marketDate,
  isDelayed: true,
  dataMode: "mock",
  confidence: 65,
});

export class MockMarketDataProvider implements MarketDataProvider {
  mode = "mock" as const;

  async getGlobalMarkets(): Promise<MarketQuote[]> {
    const marketDate = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const rows = [
      ["DJI", "Dow Jones", "點", 42620, 0.18, "景氣循環股溫和支撐風險偏好"],
      ["SPX", "S&P 500", "點", 6012, -0.22, "大型股略有整理"],
      ["IXIC", "Nasdaq", "點", 19710, -0.58, "科技股承壓，台股電子可能震盪"],
      ["SOX", "費城半導體", "點", 5180, -0.91, "半導體短線情緒偏弱"],
      ["RUT", "Russell 2000", "點", 2280, 0.12, "中小型股廣度中性"],
      ["VIX", "VIX", "點", 17.4, 3.2, "避險需求略升"],
      ["US2Y", "美國 2 年期殖利率", "%", 4.21, 0.04, "短端利率仍限制估值"],
      [
        "US10Y",
        "美國 10 年期殖利率",
        "%",
        4.38,
        0.07,
        "殖利率上升對成長股估值不利",
      ],
      ["DXY", "美元指數", "點", 104.2, 0.31, "美元轉強可能壓抑外資風險偏好"],
      ["USDTWD", "USD/TWD", "元", 32.74, 0.2, "台幣偏弱需觀察外資動向"],
      ["WTI", "原油", "美元/桶", 76.1, -0.4, "能源成本壓力暫未升高"],
      ["GOLD", "黃金", "美元/盎司", 2860, 0.5, "避險需求略升"],
    ] as const;
    return rows.map(([symbol, name, unit, price, change, impact]) => ({
      symbol,
      name,
      unit,
      price: point(price, marketDate),
      changePercent: point(change, marketDate),
      impact,
    }));
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    const marketDate = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    return [
      {
        symbol: "2330",
        name: "台積電",
        market: "TW",
        price: point(1060, marketDate),
        dayChangePercent: -0.9,
        revenueGrowth: 24,
        epsGrowth: 30,
        grossMarginTrend: 1.2,
        freeCashFlowTrend: 18,
        forwardPe: 23,
        fundamentals: point(
          {
            eps: 48.6,
            revenueGrowth: 24,
            epsGrowth: 30,
            grossMargin: 57.2,
            grossMarginTrend: 1.2,
            freeCashFlow: 920_000_000_000,
            freeCashFlowTrend: 18,
            trailingPe: 24.1,
            forwardPe: 23,
          },
          marketDate,
        ),
        outlook: "穩定",
        thesisIntact: true,
        majorRisk: "先進製程需求不如預期或地緣政治升溫",
        nextEvent: "下一次法說會",
      },
      {
        symbol: "NVDA",
        name: "NVIDIA",
        market: "US",
        price: point(138.4, marketDate),
        dayChangePercent: -1.7,
        revenueGrowth: 78,
        epsGrowth: 82,
        grossMarginTrend: -0.5,
        freeCashFlowTrend: 55,
        forwardPe: 34,
        fundamentals: point(
          {
            eps: 3.92,
            revenueGrowth: 78,
            epsGrowth: 82,
            grossMargin: 73.5,
            grossMarginTrend: -0.5,
            freeCashFlow: 60_000_000_000,
            freeCashFlowTrend: 55,
            trailingPe: 40.2,
            forwardPe: 34,
          },
          marketDate,
        ),
        outlook: "穩定",
        thesisIntact: true,
        majorRisk: "AI 資本支出放緩、競爭與出口限制",
        nextEvent: "下一次財報",
      },
      {
        symbol: "2317",
        name: "鴻海",
        market: "TW",
        price: point(187.5, marketDate),
        dayChangePercent: 0.5,
        revenueGrowth: 12,
        epsGrowth: 14,
        grossMarginTrend: 0.2,
        freeCashFlowTrend: 8,
        forwardPe: 15,
        fundamentals: point(
          {
            eps: 12.8,
            revenueGrowth: 12,
            epsGrowth: 14,
            grossMargin: 6.4,
            grossMarginTrend: 0.2,
            freeCashFlow: 145_000_000_000,
            freeCashFlowTrend: 8,
            trailingPe: 16.1,
            forwardPe: 15,
          },
          marketDate,
        ),
        outlook: "穩定",
        thesisIntact: true,
        majorRisk: "AI 伺服器成長未能抵銷消費電子波動",
        nextEvent: "月營收公告",
      },
    ];
  }
}
