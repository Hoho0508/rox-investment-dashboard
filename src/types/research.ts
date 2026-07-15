import type { DataMode, ScoreResult, StockSnapshot } from "@/types/domain";

export type InvestorConferenceEvent = {
  symbol: string;
  companyName: string;
  market: "TWSE" | "TPEx";
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  summary: string;
  daysUntil: number;
  sourceUrl: string;
};

export type BeginnerVerdict =
  "法說前先觀察" | "適合開始研究" | "等待確認" | "風險較高" | "資料不足";

export type BeginnerDecision = {
  symbol: string;
  name: string;
  verdict: BeginnerVerdict;
  summary: string;
  supporting: string[];
  opposing: string[];
  biggestRisk: string;
  invalidation: string;
  confidence: number;
  dataMode: DataMode;
  marketDate?: string;
  sourceName: string;
  upcomingEvent?: InvestorConferenceEvent;
};

export type ResearchStock = {
  symbol: string;
  name: string;
  exchange: "TWSE" | "TPEx";
};

export type StockLibrary = {
  id: "memory" | "ai" | "ic-design" | "weighted";
  name: string;
  description: string;
  stocks: ResearchStock[];
};

export type ReportStock = StockSnapshot & {
  entry: ScoreResult;
  exit: ScoreResult;
};
