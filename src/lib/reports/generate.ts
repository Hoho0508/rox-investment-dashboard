import { DEFAULT_SCENARIOS } from "@/lib/config/market-scenarios";
import { getMarketProvider, resolveDataMode } from "@/lib/providers";
import { isTaiwanTradingDay, taipeiDate } from "@/lib/reports/calendar";
import { calculateEntryScore } from "@/lib/scoring/entry";
import { calculateExitWarning } from "@/lib/scoring/exit";
import type { DailyReport } from "@/types/domain";
import type { ReportType } from "@/lib/reports/config";

function reportNarrative(
  reportType: ReportType,
  isTradingDay: boolean,
  scenarioModelAvailable: boolean,
) {
  if (!isTradingDay) {
    return {
      keyPoints: [
        "今日台股休市，保留最近交易日作為檢討基準",
        "確認全球科技股、利率與匯率是否改變風險條件",
        "不以休市期間的單一消息提前做出進出場決定",
      ],
      conclusion:
        "今日台股休市；以最近交易日資料檢查投資理由，不因短線消息改變長期紀律。",
      discipline: [
        "等待正式資料確認",
        "避免預判開盤",
        "先問為什麼，再問買不買。",
      ],
    };
  }
  if (!scenarioModelAvailable) {
    return {
      keyPoints: [
        "全球市場正式資料不足，暫不推定今日方向與波動",
        "個股欄位只顯示已成功取得且可追溯來源的資料",
        "補齊市場、新聞與基本面資料前，維持資料驗證狀態",
      ],
      conclusion:
        "目前資料不足，無法形成可信的市場方向、情境機率或操作判斷；請先查看缺少資料清單。",
      discipline: [
        "不以缺漏資料推測盤勢",
        "等待正式資料確認",
        "先確認來源與時間，再閱讀分析。",
      ],
    };
  }
  if (reportType === "midday") {
    return {
      keyPoints: [
        "午盤先檢查量價是否同步，不以半日漲幅直接追價",
        "比較電子權值、金融與傳產的強弱是否一致",
        "留意午後成交量與早盤方向是否出現背離",
      ],
      conclusion:
        "午盤以趨勢延續、量價配合與風險條件為主；若只有價格上漲而缺少成交量確認，維持觀察。",
      discipline: [
        "不因早盤急漲追高",
        "等待量價確認",
        "午盤訊號需由收盤資料再次驗證",
      ],
    };
  }
  if (reportType === "close") {
    return {
      keyPoints: [
        "用收盤價確認今日突破或跌破是否成立",
        "檢查成交量、主要權值股與市場廣度是否支持盤勢",
        "記錄今日判斷，留待後續 5／20／60 日報酬驗證",
      ],
      conclusion:
        "盤後以完整收盤資料重新檢查投資理由與風險；今日結果僅作研究證據，不直接等同明日方向。",
      discipline: [
        "盤後不衝動下單",
        "複核投資理由與失效條件",
        "為下一交易日預先寫下觀察條件",
      ],
    };
  }
  return {
    keyPoints: [
      "美國科技與半導體類股短線整理",
      "美元與長端殖利率偏強",
      "台股電子權值股可能主導盤勢",
    ],
    conclusion:
      "科技股情緒偏弱、殖利率上升，台股較可能震盪；核心公司的長期基本面需以正式財報持續驗證。",
    discipline: [
      "等待正式資料確認",
      "避免追高",
      "避免因單日大跌衝動進場",
      "先問為什麼，再問買不買。",
    ],
  };
}

function buildScenarios(scenarioModelAvailable: boolean) {
  if (!scenarioModelAvailable) {
    const unavailable = "資料不足，暫不進行情境推估";
    return [
      {
        name: "偏多" as const,
        probability: DEFAULT_SCENARIOS.bullish,
        trigger: unavailable,
        beneficiaries: "無法判斷",
        pressured: "無法判斷",
        coreImpact: "等待正式資料",
        changeSignal: "補齊正式市場資料後重新計算",
      },
      {
        name: "基準震盪" as const,
        probability: DEFAULT_SCENARIOS.base,
        trigger: unavailable,
        beneficiaries: "無法判斷",
        pressured: "無法判斷",
        coreImpact: "等待正式資料",
        changeSignal: "補齊正式市場資料後重新計算",
      },
      {
        name: "偏空" as const,
        probability: DEFAULT_SCENARIOS.bearish,
        trigger: unavailable,
        beneficiaries: "無法判斷",
        pressured: "無法判斷",
        coreImpact: "等待正式資料",
        changeSignal: "補齊正式市場資料後重新計算",
      },
    ];
  }
  return [
    {
      name: "偏多" as const,
      probability: DEFAULT_SCENARIOS.bullish,
      trigger: "美債殖利率回落、半導體轉強",
      beneficiaries: "大型電子、AI 供應鏈",
      pressured: "防禦型資產",
      coreImpact: "台積電、NVIDIA、鴻海情緒改善",
      changeSignal: "市場廣度與成交量同步改善",
    },
    {
      name: "基準震盪" as const,
      probability: DEFAULT_SCENARIOS.base,
      trigger: "利率高檔、企業展望未顯著改變",
      beneficiaries: "基本面穩定個股",
      pressured: "高估值題材股",
      coreImpact: "核心標的區間整理",
      changeSignal: "美元、殖利率或公司消息突破近期區間",
    },
    {
      name: "偏空" as const,
      probability: DEFAULT_SCENARIOS.bearish,
      trigger: "殖利率急升或 AI CapEx 下修",
      beneficiaries: "現金與低波動族群",
      pressured: "半導體與高估值成長股",
      coreImpact: "核心標的短線承壓，先複核基本面",
      changeSignal: "公司展望下修或資金明顯撤出",
    },
  ];
}

export async function generateReport(
  reportType: ReportType,
  now = new Date(),
): Promise<DailyReport> {
  const provider = getMarketProvider();
  const resolution = resolveDataMode();
  const [globalMarkets, coreStocks] = await Promise.all([
    provider.getGlobalMarkets(),
    provider.getCoreStocks(),
  ]);
  const isTradingDay = isTaiwanTradingDay(now);
  const scenarioModelAvailable = globalMarkets.some(
    (item) => item.price.value !== null && item.changePercent.value !== null,
  );
  const narrative = reportNarrative(
    reportType,
    isTradingDay,
    scenarioModelAvailable,
  );
  const fallbackErrors = coreStocks.flatMap((stock) =>
    stock.price.error ? [`${stock.symbol}：${stock.price.error}`] : [],
  );
  const missingData = [
    resolution.warning,
    globalMarkets.length === 0
      ? "全球市場正式資料 Provider 尚未串接；未使用 Mock 數值。"
      : undefined,
    ...fallbackErrors,
  ].filter((item): item is string => Boolean(item));
  const allPoints = [
    ...globalMarkets.map((item) => item.price),
    ...coreStocks.map((item) => item.price),
  ];
  const latestDataAt =
    allPoints
      .map((item) => item.fetchedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? now.toISOString();
  const reportDataMode =
    allPoints.some((item) => item.dataMode === "unavailable") ||
    allPoints.length === 0
      ? "unavailable"
      : allPoints.every((item) => item.dataMode === "live")
        ? "live"
        : allPoints.some((item) => item.dataMode === "manual")
          ? "manual"
          : "mock";
  return {
    reportType,
    reportDate: taipeiDate(now),
    generatedAt: now.toISOString(),
    latestDataAt,
    dataMode: reportDataMode,
    completeness: Math.round(
      (allPoints.filter(
        (item) => item.value !== null && item.dataMode !== "mock",
      ).length /
        15) *
        100,
    ),
    isTradingDay,
    marketView: scenarioModelAvailable ? "震盪" : "資料不足",
    confidence: scenarioModelAvailable ? 68 : 0,
    volatility: scenarioModelAvailable ? "中" : "未知",
    keyPoints: narrative.keyPoints,
    conclusion: narrative.conclusion,
    globalMarkets,
    stocks: coreStocks.map((stock) => ({
      ...stock,
      entry: calculateEntryScore(stock),
      exit: calculateExitWarning(stock),
    })),
    scenarioModelAvailable,
    scenarios: buildScenarios(scenarioModelAvailable),
    risks: scenarioModelAvailable
      ? [
          {
            name: "美債殖利率上升",
            probability: "中" as const,
            impact: "高" as const,
            affected: ["NVDA", "2330"],
            monitor: "美國 10 年期殖利率",
            invalidation: "殖利率回落且通膨預期下降",
          },
          {
            name: "AI 資本支出低於預期",
            probability: "低" as const,
            impact: "高" as const,
            affected: ["NVDA", "2330", "2317"],
            monitor: "雲端業者 CapEx 與公司展望",
            invalidation: "主要雲端業者持續上修資本支出",
          },
          {
            name: "資料延遲與不完整",
            probability: "高" as const,
            impact: "中" as const,
            affected: ["全部標的"],
            monitor: "資料來源與更新時間",
            invalidation: "正式來源資料完整且通過日期驗證",
          },
        ]
      : [
          {
            name: "資料延遲與不完整",
            probability: "高",
            impact: "高",
            affected: ["全部標的"],
            monitor: "資料來源、日期與完整度",
            invalidation: "正式來源資料完整且通過日期驗證",
          },
        ],
    events: [
      {
        time: "未設定",
        name: "經濟事件資料待 Live provider 串接",
        importance: scenarioModelAvailable ? "中" : "未知",
        affected: "科技股與大盤",
      },
    ],
    discipline: narrative.discipline,
    missingData,
  };
}

export function generateMorningReport(now = new Date()) {
  return generateReport("morning", now);
}

export function validateScenarioTotal(report: DailyReport) {
  return (
    report.scenarios.reduce((sum, item) => sum + item.probability, 0) === 100
  );
}
