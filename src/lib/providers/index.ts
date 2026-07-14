import { FinMindMarketDataProvider } from "@/lib/providers/finmind";
import { MockMarketDataProvider } from "@/lib/providers/mock-market";
import type { DataMode } from "@/types/domain";

export function resolveDataMode(requested = process.env.DATA_MODE): {
  mode: DataMode;
  warning?: string;
} {
  if (requested === "manual")
    return {
      mode: "manual",
      warning: "手動資料不足時會以模擬資料補足並清楚標示。",
    };
  if (requested === "live") {
    if (process.env.LIVE_MARKET_API_KEY)
      return {
        mode: "live",
        warning: "Live provider 尚未實作，已安全降級為模擬資料。",
      };
    return { mode: "mock", warning: "未設定 Live API Key，已降級為模擬資料。" };
  }
  return { mode: "mock" };
}

export function getMarketProvider() {
  return new FinMindMarketDataProvider(new MockMarketDataProvider());
}
