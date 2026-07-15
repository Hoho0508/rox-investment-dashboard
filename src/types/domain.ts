export type DataMode = "mock" | "manual" | "live" | "unavailable";
export type Level = "低" | "中" | "高";

export type DataPoint<T> = {
  value: T | null;
  sourceName: string;
  sourceUrl?: string;
  fetchedAt: string;
  marketDate?: string;
  isDelayed: boolean;
  dataMode: DataMode;
  confidence: number;
  error?: string;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  unit: string;
  price: DataPoint<number>;
  changePercent: DataPoint<number>;
  impact: string;
};

export type StockSnapshot = {
  symbol: string;
  name: string;
  market: "TW" | "US";
  price: DataPoint<number>;
  dayChangePercent: number;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  grossMarginTrend: number | null;
  freeCashFlowTrend: number | null;
  forwardPe: number | null;
  outlook: "上修" | "穩定" | "下修" | "未知";
  thesisIntact: boolean | null;
  majorRisk: string;
  nextEvent: string;
};

export type Scenario = {
  name: "偏多" | "基準震盪" | "偏空";
  probability: number;
  trigger: string;
  beneficiaries: string;
  pressured: string;
  coreImpact: string;
  changeSignal: string;
};

export type RiskItem = {
  name: string;
  probability: Level;
  impact: Level;
  affected: string[];
  monitor: string;
  invalidation: string;
};

export type ScoreResult = {
  score: number;
  confidence: number;
  label: string;
  supporting: string[];
  opposing: string[];
  missing: string[];
  biggestRisk: string;
  raiseConditions: string[];
  lowerConditions: string[];
};

export type MorningReport = {
  id?: string;
  reportType: import("@/lib/reports/config").ReportType;
  reportDate: string;
  generatedAt: string;
  latestDataAt: string;
  dataMode: DataMode;
  completeness: number;
  isTradingDay: boolean;
  marketView: "偏多" | "中性偏多" | "震盪" | "中性偏空" | "偏空";
  confidence: number;
  volatility: Level;
  keyPoints: string[];
  conclusion: string;
  globalMarkets: MarketQuote[];
  stocks: Array<StockSnapshot & { entry: ScoreResult; exit: ScoreResult }>;
  scenarios: Scenario[];
  risks: RiskItem[];
  events: Array<{
    time: string;
    name: string;
    importance: Level;
    affected: string;
  }>;
  discipline: string[];
  missingData: string[];
};

export type DailyReport = MorningReport;
