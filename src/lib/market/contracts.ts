import type { LiveQuote, PriceCandle, TaiwanSecurity } from "@/types/market";

export interface RealtimeTaiwanMarketProvider {
  search(query: string, limit?: number): Promise<TaiwanSecurity[]>;
  getQuotes(symbols: string[]): Promise<LiveQuote[]>;
  getCandles(symbol: string, limit?: number): Promise<PriceCandle[]>;
}
