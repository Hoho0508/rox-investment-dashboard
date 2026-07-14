import { ENTRY_BANDS, ENTRY_WEIGHTS } from "@/lib/config/scoring";
import type { ScoreResult, StockSnapshot } from "@/types/domain";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const band = (score: number) =>
  ENTRY_BANDS.find((item) => score >= item.min)!.label;

export function calculateEntryScore(
  stock: StockSnapshot,
  portfolioConcentration = 0,
): ScoreResult {
  const missing: string[] = [];
  if (stock.epsGrowth === null) missing.push("EPS 成長");
  if (stock.revenueGrowth === null) missing.push("營收成長");
  if (stock.freeCashFlowTrend === null) missing.push("自由現金流");
  if (stock.forwardPe === null) missing.push("預估本益比");

  const fundamentalsRaw = [
    stock.epsGrowth,
    stock.revenueGrowth,
    stock.freeCashFlowTrend,
  ]
    .filter((value): value is number => value !== null)
    .reduce(
      (sum, value) =>
        sum + (value > 10 ? 100 : value > 0 ? 70 : value > -10 ? 35 : 5),
      0,
    );
  const fundamentalCount =
    3 - missing.filter((item) => item !== "預估本益比").length;
  const fundamentals = fundamentalCount
    ? fundamentalsRaw / fundamentalCount
    : 0;
  const valuation =
    stock.forwardPe === null
      ? 0
      : stock.forwardPe <= 20
        ? 90
        : stock.forwardPe <= 30
          ? 70
          : stock.forwardPe <= 40
            ? 45
            : 20;
  const industry =
    stock.outlook === "上修"
      ? 90
      : stock.outlook === "穩定"
        ? 70
        : stock.outlook === "下修"
          ? 15
          : 40;
  // 價格單日下跌不會提高技術分數；技術面固定為中性輔助。
  const technical = 50;
  const thesis =
    stock.thesisIntact === true ? 90 : stock.thesisIntact === false ? 10 : 35;
  const risk = portfolioConcentration > 30 ? 20 : 80;
  let score =
    (fundamentals * ENTRY_WEIGHTS.fundamentals +
      valuation * ENTRY_WEIGHTS.valuation +
      industry * ENTRY_WEIGHTS.marketIndustry +
      technical * ENTRY_WEIGHTS.technicalPosition +
      thesis * ENTRY_WEIGHTS.thesisCompleteness +
      risk * ENTRY_WEIGHTS.riskManagement) /
    100;
  if (stock.outlook === "下修" || (stock.freeCashFlowTrend ?? 0) < -10)
    score = Math.min(score, 49);
  if (missing.length >= 2) score = Math.min(score, 64);
  const finalScore = clamp(score);
  return {
    score: finalScore,
    confidence: clamp(100 - missing.length * 18),
    label: band(finalScore),
    supporting: [
      stock.epsGrowth && stock.epsGrowth > 0 ? "EPS 維持成長" : "",
      stock.thesisIntact ? "投資理由仍成立" : "",
    ].filter(Boolean),
    opposing: [
      stock.outlook === "下修" ? "公司展望下修" : "",
      portfolioConcentration > 30 ? "持股集中度偏高" : "",
    ].filter(Boolean),
    missing,
    biggestRisk: stock.majorRisk,
    raiseConditions: ["財報持續支持成長", "估值回到合理區間且基本面未惡化"],
    lowerConditions: ["公司下修展望", "自由現金流或毛利率持續惡化"],
  };
}
