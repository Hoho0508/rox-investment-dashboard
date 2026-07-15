import type { MorningReport } from "@/types/domain";

export type MarketPulse = {
  sentiment: { score: number; label: string };
  strongestGroups: string[];
  fundFlows: Array<{ sector: string; direction: "↑" | "→" | "↓" }>;
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
  const changes = Object.fromEntries(
    report.globalMarkets.map((item) => [
      item.symbol,
      item.changePercent.value ?? 0,
    ]),
  );
  const score = clamp(
    52 +
      (changes.SPX ?? 0) * 4 +
      (changes.IXIC ?? 0) * 4 +
      (changes.SOX ?? 0) * 3 -
      Math.max(0, changes.VIX ?? 0) * 1.5,
  );
  const label =
    score >= 70
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
        : ["半導體", "AI 伺服器", "電子權值"],
    fundFlows: [
      { sector: "電子", direction: technologyDirection },
      { sector: "金融", direction: "→" },
      { sector: "傳產", direction: technologyDirection === "↑" ? "↓" : "→" },
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
        : undefined,
  };
}
