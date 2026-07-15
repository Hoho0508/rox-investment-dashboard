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
    if (process.env.FINMIND_API_TOKEN || process.env.FUGLE_MARKETDATA_API_KEY)
      return {
        mode: "live",
        warning:
          "僅已授權的資料來源使用正式資料，其餘項目會清楚標示並安全降級。",
      };
    return { mode: "mock", warning: "未設定行情 API 金鑰，已降級為模擬資料。" };
  }
  return { mode: "mock" };
}

export function getMarketProvider() {
  return new FinMindMarketDataProvider(new MockMarketDataProvider());
}
