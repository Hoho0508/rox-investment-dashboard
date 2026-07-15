import type {
  BeginnerDecision,
  InvestorConferenceEvent,
  ReportStock,
} from "@/types/research";

export const BEGINNER_GLOSSARY = [
  {
    term: "營收成長",
    explanation: "公司賣出的商品或服務比去年同期多多少；成長不代表一定更賺錢。",
  },
  {
    term: "EPS 成長",
    explanation: "每股獲利比去年同期增加多少，可用來觀察獲利是否真的跟上營收。",
  },
  {
    term: "自由現金流",
    explanation:
      "公司營運與投資後實際留下的現金；長期為正通常比帳面獲利更踏實。",
  },
  {
    term: "本益比（PE）",
    explanation:
      "市場願意用多少倍獲利買進公司；高低要和成長、同業及自身歷史比較。",
  },
  {
    term: "RSI",
    explanation:
      "衡量近期漲跌速度；偏高代表漲得快，不等於一定要跌，偏低也不等於一定反彈。",
  },
  {
    term: "成交量",
    explanation:
      "市場交易熱度；放量要搭配價格、趨勢與消息判讀，不能單獨形成結論。",
  },
] as const;

function fmt(value: number | null, suffix = "%") {
  return value === null ? "資料不足" : `${value.toFixed(1)}${suffix}`;
}

export function buildBeginnerDecision(
  stock: ReportStock,
  event?: InvestorConferenceEvent,
): BeginnerDecision {
  const hasPrice = stock.price.value !== null;
  const missingFundamentals = [
    stock.revenueGrowth,
    stock.epsGrowth,
    stock.freeCashFlowTrend,
  ].filter((value) => value === null).length;
  const positiveFundamentals = [
    stock.revenueGrowth,
    stock.epsGrowth,
    stock.freeCashFlowTrend,
  ].filter((value) => value !== null && value > 0).length;
  const negativeFundamentals = [
    stock.revenueGrowth,
    stock.epsGrowth,
    stock.freeCashFlowTrend,
  ].filter((value) => value !== null && value < 0).length;

  let verdict: BeginnerDecision["verdict"] = "等待確認";
  let summary = "目前訊號有好有壞，先確認基本面、價格位置與風險是否一致。";
  if (!hasPrice || missingFundamentals >= 2) {
    verdict = "資料不足";
    summary = "可驗證資料不足，現在不適合做高信心判斷。";
  } else if (event && event.daysUntil <= 2) {
    verdict = "法說前先觀察";
    summary = "法說會即將登場，資訊可能快速改變，先閱讀公司說明再重新評估。";
  } else if (stock.entry.score >= 65 && positiveFundamentals >= 2) {
    verdict = "適合開始研究";
    summary =
      "已有多項正向證據，可進一步研究，但仍不能取代完整查證與風險管理。";
  } else if (stock.entry.score < 45 || negativeFundamentals >= 2) {
    verdict = "風險較高";
    summary = "目前反對證據較多，應先找出惡化原因與可能失效條件。";
  }

  const supporting = [
    stock.revenueGrowth !== null && stock.revenueGrowth > 0
      ? `營收年增 ${fmt(stock.revenueGrowth)}，代表銷售規模仍在擴張。`
      : "",
    stock.epsGrowth !== null && stock.epsGrowth > 0
      ? `EPS 年增 ${fmt(stock.epsGrowth)}，獲利有跟上成長。`
      : "",
    stock.freeCashFlowTrend !== null && stock.freeCashFlowTrend > 0
      ? `自由現金流趨勢 ${fmt(stock.freeCashFlowTrend)}，現金創造能力改善。`
      : "",
    ...stock.entry.supporting,
  ].filter(Boolean);
  const opposing = [
    stock.revenueGrowth !== null && stock.revenueGrowth < 0
      ? `營收年減 ${fmt(stock.revenueGrowth)}，需求或出貨需要進一步確認。`
      : "",
    stock.epsGrowth !== null && stock.epsGrowth < 0
      ? `EPS 年減 ${fmt(stock.epsGrowth)}，獲利動能轉弱。`
      : "",
    stock.forwardPe === null
      ? "缺少合法的分析師預估本益比，估值判斷仍不完整。"
      : "",
    event ? `距離法說會剩 ${event.daysUntil} 天，公告可能改變目前判斷。` : "",
    ...stock.entry.opposing,
  ].filter(Boolean);

  return {
    symbol: stock.symbol,
    name: stock.name,
    verdict,
    summary,
    supporting: supporting.length ? supporting : ["目前沒有足夠的正向證據。"],
    opposing: opposing.length
      ? opposing
      : ["目前未發現明確反對證據，但仍需持續追蹤。"],
    biggestRisk: event
      ? `法說內容或公司展望與市場預期不同；${stock.majorRisk}`
      : stock.entry.biggestRisk,
    invalidation:
      stock.entry.lowerConditions[0] ??
      "公司展望或現金流持續惡化時需重新評估。",
    confidence: Math.min(
      stock.entry.confidence,
      event && event.daysUntil <= 2 ? 55 : 100,
    ),
    dataMode: stock.price.dataMode,
    marketDate: stock.price.marketDate,
    sourceName: stock.price.sourceName,
    upcomingEvent: event,
  };
}
