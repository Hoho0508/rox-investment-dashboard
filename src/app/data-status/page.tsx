import { latestOrPreview } from "@/lib/reports/view";
export const dynamic = "force-dynamic";
export default async function DataStatusPage() {
  const report = await latestOrPreview();
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Provenance</div>
          <h1>資料來源與更新狀態</h1>
        </div>
      </div>
      <div className="notice">
        正式站採嚴格真實資料模式。尚未串接或暫時失效的來源會顯示缺少資料，不使用
        Mock 數值補位。
      </div>
      <div className="card section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>資料</th>
                <th>來源</th>
                <th>市場日期</th>
                <th>擷取時間</th>
                <th>模式／延遲</th>
              </tr>
            </thead>
            <tbody>
              {report.globalMarkets.length ? (
                report.globalMarkets.map((item) => (
                  <tr key={item.symbol}>
                    <td>{item.name}</td>
                    <td>{item.price.sourceName}</td>
                    <td>{item.price.marketDate}</td>
                    <td>
                      {new Date(item.price.fetchedAt).toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei",
                      })}
                    </td>
                    <td>
                      {item.price.dataMode === "live" ? "正式" : "缺少資料"}／
                      {item.price.isDelayed ? "延遲" : "即時"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    全球市場正式資料尚未串接；正式站未使用 Mock。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
