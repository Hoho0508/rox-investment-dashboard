import type { LiveQuote } from "@/types/market";

export function unavailableQuote(
  symbol: string,
  sourceName: string,
  error: string,
): LiveQuote {
  return {
    symbol,
    name: symbol,
    exchange: "UNKNOWN",
    market: "TW",
    price: null,
    previousClose: null,
    open: null,
    high: null,
    low: null,
    change: null,
    changePercent: null,
    volume: null,
    asOf: new Date().toISOString(),
    sourceName,
    dataMode: "unavailable",
    isDelayed: true,
    status: "unavailable",
    error,
  };
}
