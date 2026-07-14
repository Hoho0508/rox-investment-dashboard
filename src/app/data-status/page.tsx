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
        目前第一版使用 Mock provider。數值是測試資料，不可視為真實行情。
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
              {report.globalMarkets.map((item) => (
                <tr key={item.symbol}>
                  <td>{item.name}</td>
                  <td>{item.price.sourceName}</td>
                  <td>{item.price.marketDate}</td>
                  <td>
                    {new Date(item.price.fetchedAt).toLocaleString("zh-TW", {
                      timeZone: "Asia/Taipei",
                    })}
                  </td>
                  <td>模擬／延遲</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
