import Link from "next/link";
import { getReportHistory } from "@/lib/reports/store";

export const dynamic = "force-dynamic";
export default async function HistoryPage() {
  let reports: Awaited<ReturnType<typeof getReportHistory>> = [];
  try {
    reports = await getReportHistory();
  } catch {
    /* 資料庫初始化前顯示空狀態 */
  }
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Archive</div>
          <h1>歷史報告</h1>
          <p className="muted">保留每日晨報與資料完整度，方便事後檢討。</p>
        </div>
      </div>
      <div className="card">
        {reports.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>市場判斷</th>
                  <th>資料模式</th>
                  <th>完整度</th>
                  <th>產生時間</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <Link href="/reports">{report.reportDate}</Link>
                    </td>
                    <td>{report.marketView}</td>
                    <td>{report.dataMode}</td>
                    <td>{report.completeness}%</td>
                    <td>
                      {report.generatedAt.toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <h2>尚無已儲存報告</h2>
            <p className="muted">執行 pnpm report:generate 產生第一份晨報。</p>
          </div>
        )}
      </div>
    </>
  );
}
