export const REPORT_TYPES = ["morning", "midday", "close"] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_DEFINITIONS: Record<
  ReportType,
  {
    label: string;
    title: string;
    eyebrow: string;
    actionLabel: string;
    jobName: string;
    taipeiTime: string;
  }
> = {
  morning: {
    label: "晨報",
    title: "今日市場晨報",
    eyebrow: "Rox Daily Morning Report",
    actionLabel: "立即產生晨報",
    jobName: "morning-report",
    taipeiTime: "09:00",
  },
  midday: {
    label: "午盤",
    title: "今日午盤報告",
    eyebrow: "Rox Midday Market Report",
    actionLabel: "立即產生午盤報告",
    jobName: "midday-report",
    taipeiTime: "12:30",
  },
  close: {
    label: "盤後",
    title: "今日盤後報告",
    eyebrow: "Rox After Market Report",
    actionLabel: "立即產生盤後報告",
    jobName: "closing-report",
    taipeiTime: "15:00",
  },
};

export function isReportType(value: unknown): value is ReportType {
  return REPORT_TYPES.includes(value as ReportType);
}

export function parseReportType(value: unknown): ReportType {
  return isReportType(value) ? value : "morning";
}
