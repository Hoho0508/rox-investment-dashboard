import { requireOwnerSession } from "@/lib/auth/request";
import { parseReportType } from "@/lib/reports/config";
import { runReportJob } from "@/lib/reports/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      reportType?: unknown;
    };
    const reportType = parseReportType(body.reportType);
    // 使用者主動要求產生時更新同日同類報告；資料庫 upsert 仍確保只有一筆。
    const result = await runReportJob(reportType, { force: true });
    return Response.json(result, {
      status: result.status === "created" ? 201 : 200,
    });
  } catch {
    return Response.json(
      { error: "報告產生失敗，請查看排程執行紀錄。" },
      { status: 500 },
    );
  }
}
