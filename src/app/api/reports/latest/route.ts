import { requireOwnerSession } from "@/lib/auth/request";
import { getLatestReport } from "@/lib/reports/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const report = await getLatestReport();
  return report
    ? Response.json(report)
    : Response.json({ error: "目前沒有晨報。" }, { status: 404 });
}
