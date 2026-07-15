import type { StockSnapshot } from "@/types/domain";

export type CoreStockIdentity = Pick<
  StockSnapshot,
  "symbol" | "name" | "market"
>;

/** Product configuration only. It contains no prices, fundamentals or analysis. */
export const CORE_STOCKS: CoreStockIdentity[] = [
  { symbol: "2330", name: "台積電", market: "TW" },
  { symbol: "NVDA", name: "NVIDIA", market: "US" },
  { symbol: "2317", name: "鴻海", market: "TW" },
];
