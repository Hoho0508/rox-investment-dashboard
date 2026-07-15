import { ReportView } from "@/components/report-view";
import { MarketPulseView } from "@/components/market-pulse";
import { buildMarketPulse } from "@/lib/intelligence/market-pulse";
import { latestOrPreview } from "@/lib/reports/view";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const report = await latestOrPreview();
  return (
    <>
      <MarketPulseView pulse={buildMarketPulse(report)} />
      <ReportView report={report} />
    </>
  );
}
