import type { CandleSeries, LiveQuote, TaiwanSecurity } from "@/types/market";

export interface TaiwanSecuritySearchProvider {
  search(query: string, limit?: number): Promise<TaiwanSecurity[]>;
}

export interface RealtimeQuoteProvider {
  getQuotes(symbols: string[]): Promise<LiveQuote[]>;
}

export interface CandleProvider {
  getCandleSeries(symbol: string): Promise<CandleSeries>;
}

export interface RealtimeTaiwanMarketProvider
  extends TaiwanSecuritySearchProvider, RealtimeQuoteProvider {}
