import { ReportView } from "@/components/report-view";
import { latestOrPreview } from "@/lib/reports/view";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  return <ReportView report={await latestOrPreview()} />;
}
