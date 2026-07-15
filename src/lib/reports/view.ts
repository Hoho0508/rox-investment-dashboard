import { generateReport } from "@/lib/reports/generate";
import type { ReportType } from "@/lib/reports/config";
import { getLatestReport, getReportByDate } from "@/lib/reports/store";

export async function latestOrPreview(
  reportType: ReportType = "morning",
  reportDate?: string,
) {
  try {
    const saved = reportDate
      ? await getReportByDate(reportDate, reportType)
      : await getLatestReport(reportType);
    return saved ?? (await generateReport(reportType));
  } catch {
    return generateReport(reportType);
  }
}
