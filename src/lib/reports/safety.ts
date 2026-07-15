import type { DailyReport } from "@/types/domain";

const INSUFFICIENT_KEY_POINTS = [
  "全球市場正式資料不足，暫不推定今日方向與波動",
  "個股欄位只顯示已成功取得且可追溯來源的資料",
  "補齊市場、新聞與基本面資料前，維持資料驗證狀態",
];

const INSUFFICIENT_CONCLUSION =
  "目前資料不足，無法形成可信的市場方向、情境機率或操作判斷；請先查看缺少資料清單。";

export function sanitizeReportForDataAvailability(
  report: DailyReport,
): DailyReport {
  if (report.scenarioModelAvailable) return report;
  return {
    ...report,
    marketView: "資料不足",
    confidence: 0,
    volatility: "未知",
    keyPoints: report.isTradingDay ? INSUFFICIENT_KEY_POINTS : report.keyPoints,
    conclusion: report.isTradingDay
      ? INSUFFICIENT_CONCLUSION
      : report.conclusion,
    scenarios: report.scenarios.map((scenario) => ({
      ...scenario,
      trigger: "資料不足，暫不進行情境推估",
      beneficiaries: "無法判斷",
      pressured: "無法判斷",
      coreImpact: "等待正式資料",
      changeSignal: "補齊正式市場資料後重新計算",
    })),
    risks: [
      {
        name: "資料延遲與不完整",
        probability: "高",
        impact: "高",
        affected: ["全部標的"],
        monitor: "資料來源、日期與完整度",
        invalidation: "正式來源資料完整且通過日期驗證",
      },
    ],
    events: report.events.map((event) => ({
      ...event,
      importance: "未知",
    })),
    discipline: report.isTradingDay
      ? [
          "不以缺漏資料推測盤勢",
          "等待正式資料確認",
          "先確認來源與時間，再閱讀分析。",
        ]
      : report.discipline,
  };
}
