import { ReportView } from "@/components/report-view";
import { latestOrPreview } from "@/lib/reports/view";
import { parseReportType } from "@/lib/reports/config";

export const dynamic = "force-dynamic";
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; date?: string }>;
}) {
  const params = await searchParams;
  const reportType = parseReportType(params.type);
  return <ReportView report={await latestOrPreview(reportType, params.date)} />;
}
