import { DEFAULT_SCENARIOS } from "@/lib/config/market-scenarios";
import { getMarketProvider, resolveDataMode } from "@/lib/providers";
import { isTaiwanTradingDay, taipeiDate } from "@/lib/reports/calendar";
import { calculateEntryScore } from "@/lib/scoring/entry";
import { calculateExitWarning } from "@/lib/scoring/exit";
import type { MorningReport } from "@/types/domain";

export async function generateMorningReport(
  now = new Date(),
): Promise<MorningReport> {
  const provider = getMarketProvider();
  const resolution = resolveDataMode();
  const [globalMarkets, coreStocks] = await Promise.all([
    provider.getGlobalMarkets(),
    provider.getCoreStocks(),
  ]);
  const latestDataAt =
    globalMarkets
      .map((item) => item.price.fetchedAt)
      .sort()
      .at(-1) ?? now.toISOString();
  const isTradingDay = isTaiwanTradingDay(now);
  const fallbackErrors = coreStocks.flatMap((stock) =>
    stock.price.error ? [`${stock.symbol}：${stock.price.error}`] : [],
  );
  const missingData = [resolution.warning, ...fallbackErrors].filter(
    (item): item is string => Boolean(item),
  );
  const allPoints = [
    ...globalMarkets.map((item) => item.price),
    ...coreStocks.map((item) => item.price),
  ];
  const reportDataMode = allPoints.every((item) => item.dataMode === "live")
    ? "live"
    : allPoints.some((item) => item.dataMode === "manual")
      ? "manual"
      : "mock";
  return {
    reportDate: taipeiDate(now),
    generatedAt: now.toISOString(),
    latestDataAt,
    dataMode: reportDataMode,
    completeness: Math.round(
      ((globalMarkets.length + coreStocks.length) / 15) * 100,
    ),
    isTradingDay,
    marketView: "震盪",
    confidence: 68,
    volatility: "中",
    keyPoints: [
      "美國科技與半導體類股短線整理",
      "美元與長端殖利率偏強",
      isTradingDay
        ? "台股電子權值股可能主導盤勢"
        : "今日台股休市，聚焦最新美股與下個交易日",
    ],
    conclusion: isTradingDay
      ? "科技股情緒偏弱、殖利率上升，台股較可能震盪；核心公司的長期基本面需以正式財報持續驗證。"
      : "今日台股休市；以最近交易日資料檢查投資理由，不因短線消息改變長期紀律。",
    globalMarkets,
    stocks: coreStocks.map((stock) => ({
      ...stock,
      entry: calculateEntryScore(stock),
      exit: calculateExitWarning(stock),
    })),
    scenarios: [
      {
        name: "偏多",
        probability: DEFAULT_SCENARIOS.bullish,
        trigger: "美債殖利率回落、半導體轉強",
        beneficiaries: "大型電子、AI 供應鏈",
        pressured: "防禦型資產",
        coreImpact: "台積電、NVIDIA、鴻海情緒改善",
        changeSignal: "市場廣度與成交量同步改善",
      },
      {
        name: "基準震盪",
        probability: DEFAULT_SCENARIOS.base,
        trigger: "利率高檔、企業展望未顯著改變",
        beneficiaries: "基本面穩定個股",
        pressured: "高估值題材股",
        coreImpact: "核心標的區間整理",
        changeSignal: "美元、殖利率或公司消息突破近期區間",
      },
      {
        name: "偏空",
        probability: DEFAULT_SCENARIOS.bearish,
        trigger: "殖利率急升或 AI CapEx 下修",
        beneficiaries: "現金與低波動族群",
        pressured: "半導體與高估值成長股",
        coreImpact: "核心標的短線承壓，先複核基本面",
        changeSignal: "公司展望下修或資金明顯撤出",
      },
    ],
    risks: [
      {
        name: "美債殖利率上升",
        probability: "中",
        impact: "高",
        affected: ["NVDA", "2330"],
        monitor: "美國 10 年期殖利率",
        invalidation: "殖利率回落且通膨預期下降",
      },
      {
        name: "AI 資本支出低於預期",
        probability: "低",
        impact: "高",
        affected: ["NVDA", "2330", "2317"],
        monitor: "雲端業者 CapEx 與公司展望",
        invalidation: "主要雲端業者持續上修資本支出",
      },
      {
        name: "資料延遲與不完整",
        probability: "高",
        impact: "中",
        affected: ["全部標的"],
        monitor: "資料來源與更新時間",
        invalidation: "正式來源資料完整且通過日期驗證",
      },
    ],
    events: [
      {
        time: "未設定",
        name: "經濟事件資料待 Live provider 串接",
        importance: "中",
        affected: "科技股與大盤",
      },
    ],
    discipline: [
      "等待正式資料確認",
      "避免追高",
      "避免因單日大跌衝動進場",
      "先問為什麼，再問買不買。",
    ],
    missingData,
  };
}

export function validateScenarioTotal(report: MorningReport) {
  return (
    report.scenarios.reduce((sum, item) => sum + item.probability, 0) === 100
  );
}
