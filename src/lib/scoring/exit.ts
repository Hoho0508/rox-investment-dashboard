import { EXIT_BANDS } from "@/lib/config/scoring";
import type { ScoreResult, StockSnapshot } from "@/types/domain";

export function calculateExitWarning(
  stock: StockSnapshot,
  portfolioConcentration = 0,
): ScoreResult {
  const missing = [
    stock.freeCashFlowTrend === null ? "自由現金流" : "",
    stock.thesisIntact === null ? "投資理由狀態" : "",
  ].filter(Boolean);
  let score = 10;
  if (stock.thesisIntact === false) score += 35;
  if (stock.outlook === "下修") score += 25;
  if ((stock.epsGrowth ?? 0) < 0) score += 10;
  if ((stock.revenueGrowth ?? 0) < 0) score += 10;
  if ((stock.grossMarginTrend ?? 0) < -2) score += 10;
  if ((stock.freeCashFlowTrend ?? 0) < -10) score += 15;
  if (portfolioConcentration > 30) score += 10;
  // 單日漲跌不參與計分。
  score = Math.min(100, score);
  return {
    score,
    confidence: Math.max(20, 100 - missing.length * 25),
    label: EXIT_BANDS.find((item) => score >= item.min)!.label,
    supporting: [],
    opposing: [
      stock.outlook === "下修" ? "公司展望下修" : "",
      (stock.freeCashFlowTrend ?? 0) < -10 ? "自由現金流惡化" : "",
    ].filter(Boolean),
    missing,
    biggestRisk: stock.majorRisk,
    raiseConditions: ["投資理由失效", "展望、獲利或現金流進一步惡化"],
    lowerConditions: ["財報確認營運改善", "風險事件解除"],
  };
}
