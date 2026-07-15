import type { DataMode } from "@/types/domain";

export type TaiwanSecurity = {
  symbol: string;
  name: string;
  exchange: "TWSE" | "TPEx" | "ESB" | "UNKNOWN";
  market: "TW";
};

export type LiveQuote = TaiwanSecurity & {
  price: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  asOf: string;
  sourceName: string;
  sourceUrl?: string;
  dataMode: DataMode;
  isDelayed: boolean;
  status: "open" | "closed" | "delayed" | "mock" | "unavailable";
  error?: string;
};

export type PriceCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const candleIntervals = [
  "tick",
  "1m",
  "5m",
  "15m",
  "30m",
  "60m",
  "1d",
  "1w",
  "1mo",
] as const;
export type CandleInterval = (typeof candleIntervals)[number];

export type CandleSeries = {
  symbol: string;
  interval: CandleInterval;
  candles: PriceCandle[];
  sourceName: string;
  sourceUrl?: string;
  dataMode: DataMode;
  isDelayed: boolean;
  supportsLive: boolean;
  asOf: string;
  error?: string;
};

export type SimilarMarketPeriod = {
  startDate: string;
  similarity: number;
  rsi: number;
  return20d: number;
  future5d: number | null;
  future20d: number | null;
  future60d: number | null;
};

export type MarketAnalysis = {
  symbol: string;
  asOf: string;
  verdict: "可分批觀察" | "等待確認" | "禁止進場";
  score: number;
  confidence: number;
  hardGate: boolean;
  summary: string;
  reasons: string[];
  risks: string[];
  indicators: {
    close: number;
    sma20: number;
    sma60: number;
    rsi14: number;
    return20d: number;
    return60d: number;
    volatility20d: number;
    maxDrawdown60d: number;
    volumeRatio20d: number;
  };
  analogs: SimilarMarketPeriod[];
  analogStats: {
    sampleSize: number;
    winRate20d: number | null;
    medianReturn20d: number | null;
    averageReturn20d: number | null;
  };
  disclaimer: string;
};
