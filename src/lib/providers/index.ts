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
          "正式站採嚴格真實資料模式；尚未串接或暫時失敗的項目只顯示缺少原因，不使用 Mock 補值。",
      };
    return {
      mode: "unavailable",
      warning: "未設定行情 API 金鑰；正式站不使用 Mock，資料暫時不可用。",
    };
  }
  return { mode: "mock" };
}

export function getMarketProvider() {
  return new FinMindMarketDataProvider(new MockMarketDataProvider());
}
