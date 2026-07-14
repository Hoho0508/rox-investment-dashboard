import type { DataMode, MarketQuote, StockSnapshot } from "@/types/domain";

export interface MarketDataProvider {
  mode: DataMode;
  getGlobalMarkets(): Promise<MarketQuote[]>;
  getCoreStocks(): Promise<StockSnapshot[]>;
}

export interface FundamentalDataProvider {
  mode: DataMode;
}
export interface NewsProvider {
  mode: DataMode;
}
export interface MacroDataProvider {
  mode: DataMode;
}
export interface CurrencyDataProvider {
  mode: DataMode;
}
export interface TaiwanInstitutionalDataProvider {
  mode: DataMode;
}
export interface EconomicCalendarProvider {
  mode: DataMode;
}
