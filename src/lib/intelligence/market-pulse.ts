import type { MorningReport } from "@/types/domain";

export type MarketPulse = {
  sentiment: { score: number | null; label: string };
  strongestGroups: string[];
  fundFlows: Array<{ sector: string; direction: "↑" | "→" | "↓" | "—" }>;
  narrative: string;
  narrativeEvidence: string[];
  trackedHoldings: Array<{ name: string; status: string }>;
  strategy: string[];
  confidence: number;
  dataMode: MorningReport["dataMode"];
  warning?: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function buildMarketPulse(report: MorningReport): MarketPulse {
  if (report.dataMode === "unavailable") {
    return {
      sentiment: { score: null, label: "等待正式資料" },
      strongestGroups: ["尚無正式族群資料"],
      fundFlows: [
        { sector: "電子", direction: "—" },
        { sector: "金融", direction: "—" },
        { sector: "傳產", direction: "—" },
      ],
      narrative: "正式新聞與資金流 Provider 尚未串接",
      narrativeEvidence: report.missingData,
      trackedHoldings: report.stocks.slice(0, 2).map((stock) => ({
        name: stock.name,
        status: "基本面正式資料尚未完整，暫不判斷",
      })),
      strategy: ["等待正式資料確認", "不使用模擬訊號做決策"],
      confidence: 0,
      dataMode: report.dataMode,
      warning: "正式站已停用 Mock；未串接的市場情緒、族群與資金流保持空白。",
    };
  }
  const changes = Object.fromEntries(
    report.globalMarkets.map((item) => [
      item.symbol,
      item.changePercent.value ?? 0,
    ]),
  );
  const hasLegacySentimentInputs = ["SPX", "IXIC", "SOX", "VIX"].every(
    (symbol) => changes[symbol] !== undefined,
  );
  const score =
    report.dataMode === "mock" || hasLegacySentimentInputs
      ? clamp(
          52 +
            (changes.SPX ?? 0) * 4 +
            (changes.IXIC ?? 0) * 4 +
            (changes.SOX ?? 0) * 3 -
            Math.max(0, changes.VIX ?? 0) * 1.5,
        )
      : null;
  const label =
    score === null
      ? report.marketView
      : score >= 70
        ? "偏樂觀"
        : score >= 55
          ? "中性偏多"
          : score >= 40
            ? "觀望"
            : "偏保守";
  const technologyDirection =
    (changes.SOX ?? 0) + (changes.IXIC ?? 0) > 0 ? "↑" : "↓";
  return {
    sentiment: { score, label },
    strongestGroups:
      report.dataMode === "mock"
        ? ["記憶體（示範）", "AI（示範）", "軍工（示範）"]
        : ["尚無正式族群資料"],
    fundFlows:
      report.dataMode === "mock"
        ? [
            { sector: "電子", direction: technologyDirection },
            { sector: "金融", direction: "→" },
            {
              sector: "傳產",
              direction: technologyDirection === "↑" ? "↓" : "→",
            },
          ]
        : [
            { sector: "電子", direction: "—" },
            { sector: "金融", direction: "—" },
            { sector: "傳產", direction: "—" },
          ],
    narrative:
      report.dataMode === "mock"
        ? "市場交易主題尚待新聞與族群資金流 API 驗證"
        : report.keyPoints[0],
    narrativeEvidence: report.keyPoints,
    trackedHoldings: report.stocks.slice(0, 2).map((stock) => ({
      name: stock.name,
      status:
        stock.thesisIntact === true
          ? "投資理由未出現失效證據"
          : "需要重新驗證投資理由",
    })),
    strategy: report.discipline.slice(0, 2),
    confidence: report.dataMode === "mock" ? 35 : report.confidence,
    dataMode: report.dataMode,
    warning:
      report.dataMode === "mock"
        ? "族群、資金流與市場主題為版型示範，不代表今日真實市場。"
        : report.dataMode === "stale"
          ? "行情更新失敗，市場情緒使用上一筆成功資料；族群與資金流仍 unavailable。"
          : score === null
            ? "市場方向使用 TWSE 與 U.S. Treasury 延遲資料；數字情緒分數尚未用未校準權重推算。族群與資金流仍 unavailable。"
            : "族群與資金流 Provider 尚未串接，相關欄位保持 unavailable。",
  };
}
