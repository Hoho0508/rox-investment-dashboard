import Link from "next/link";
import { getReportHistory } from "@/lib/reports/store";
import { REPORT_DEFINITIONS, parseReportType } from "@/lib/reports/config";

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
          <p className="muted">
            保留晨報、午盤與盤後報告，方便比較盤勢如何演變。
          </p>
        </div>
      </div>
      <div className="card">
        {reports.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>類型</th>
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
                      <Link
                        href={`/reports?type=${report.reportType}&date=${report.reportDate}`}
                      >
                        {report.reportDate}
                      </Link>
                    </td>
                    <td>
                      {
                        REPORT_DEFINITIONS[parseReportType(report.reportType)]
                          .label
                      }
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
            <p className="muted">到每日報告頁手動產生第一份報告。</p>
          </div>
        )}
      </div>
    </>
  );
}
