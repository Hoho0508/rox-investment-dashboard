import { isValidCronRequest } from "@/lib/auth/cron";
import { runReportJob } from "@/lib/reports/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isValidCronRequest(request))
    return Response.json({ error: "未授權的排程請求。" }, { status: 401 });
  try {
    const result = await runReportJob("midday");
    return Response.json(result, {
      status: result.status === "created" ? 201 : 200,
    });
  } catch {
    return Response.json(
      { error: "午盤報告產生失敗，請查看排程執行紀錄。" },
      { status: 500 },
    );
  }
}
