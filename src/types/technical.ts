import type { DataMode } from "@/types/domain";
import type { CandleInterval } from "@/types/market";

export type TechnicalPosition =
  | "突破"
  | "盤整"
  | "整理"
  | "回檔"
  | "主升段"
  | "末升段"
  | "空頭"
  | "反彈"
  | "修正";

export type TechnicalZone = {
  name: "適合開始研究" | "等待突破" | "等待回測" | "風險增加";
  low: number;
  high: number;
  reason: string;
};

export type TechnicalAnalysis = {
  symbol: string;
  interval: CandleInterval;
  asOf: string;
  dataMode: DataMode;
  sourceName: string;
  score: number;
  confidence: number;
  verdict: "適合開始研究" | "等待突破" | "等待回測" | "風險增加";
  position: TechnicalPosition;
  positionReason: string;
  indicators: {
    ma: Record<"5" | "10" | "20" | "60" | "120" | "240", number | null>;
    ema: Record<"20" | "60" | "120" | "240", number | null>;
    vwap: number | null;
    macd: {
      value: number | null;
      signal: number | null;
      histogram: number | null;
    };
    rsi14: number | null;
    stochastic: { k: number | null; d: number | null };
    atr14: number | null;
    momentum10: number | null;
    obv: number | null;
    volumeMa20: number | null;
    bollinger: {
      upper: number | null;
      middle: number | null;
      lower: number | null;
    };
    standardDeviation20: number | null;
  };
  supportResistance: {
    support: number;
    resistance: number;
    previousHigh: number;
    previousLow: number;
    movingAverageSupport: number | null;
  };
  zones: TechnicalZone[];
  patterns: Array<{
    name: string;
    completed: boolean;
    confidence: number;
    reason: string;
  }>;
  supportingEvidence: string[];
  opposingEvidence: string[];
  biggestRisk: string;
  invalidation: string;
  disclaimer: string;
};
