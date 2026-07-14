import { requireOwnerSession } from "@/lib/auth/request";
import { runMorningReportJob } from "@/lib/reports/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  try {
    const result = await runMorningReportJob();
    return Response.json(result, {
      status: result.status === "created" ? 201 : 200,
    });
  } catch {
    return Response.json(
      { error: "晨報產生失敗，請查看排程執行紀錄。" },
      { status: 500 },
    );
  }
}
