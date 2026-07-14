import type { MorningReport } from "@/types/domain";
import { GenerateReportButton } from "@/components/generate-report-button";

const n = (value: number | null) =>
  value === null
    ? "資料不足"
    : new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(
        value,
      );

export function ReportView({ report }: { report: MorningReport }) {
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Rox Daily Morning Report</div>
          <h1>{report.isTradingDay ? "今日市場晨報" : "台股休市版晨報"}</h1>
          <p className="muted">
            報告日期 {report.reportDate} · 產生於{" "}
            {new Date(report.generatedAt).toLocaleString("zh-TW", {
              timeZone: "Asia/Taipei",
            })}
          </p>
        </div>
        <span className="pill">
          {report.dataMode === "mock"
            ? "模擬資料"
            : report.dataMode === "manual"
              ? "手動資料"
              : "Live 資料"}
        </span>
      </div>
      <GenerateReportButton />
      {report.dataMode === "mock" && (
        <div className="notice">
          目前顯示模擬資料，不代表真實市場行情；請以正式來源確認後再做判斷。
        </div>
      )}
      <section className="grid grid-4 section">
        <div className="card">
          <div className="label">今日市場判斷</div>
          <div className="metric">{report.marketView}</div>
        </div>
        <div className="card">
          <div className="label">規則模型信心</div>
          <div className="metric">{report.confidence}</div>
          <div className="source">滿分 100</div>
        </div>
        <div className="card">
          <div className="label">預期波動</div>
          <div className="metric">{report.volatility}</div>
        </div>
        <div className="card">
          <div className="label">資料完整度</div>
          <div className="metric">{report.completeness}%</div>
        </div>
      </section>
      <section className="card hero section">
        <h2>30 秒市場摘要</h2>
        <p>{report.conclusion}</p>
        <ul className="key-list">
          {report.keyPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="section">
        <h2>今日三情境</h2>
        <div className="grid grid-3">
          {report.scenarios.map((item) => (
            <article className="card scenario" key={item.name}>
              <div className="label">{item.name}情境</div>
              <div className="metric">{item.probability}%</div>
              <div className="bar">
                <span style={{ width: `${item.probability}%` }} />
              </div>
              <p>{item.trigger}</p>
              <p className="source">核心影響：{item.coreImpact}</p>
            </article>
          ))}
        </div>
        <p className="source">
          情境為規則模型推估，不是保證；三種機率合計 100%。
        </p>
      </section>
      <section className="card section">
        <h2>全球市場</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>項目</th>
                <th>最新值</th>
                <th>漲跌幅</th>
                <th>資料日期</th>
                <th>可能影響</th>
              </tr>
            </thead>
            <tbody>
              {report.globalMarkets.map((item) => (
                <tr key={item.symbol}>
                  <td>
                    {item.name}
                    <div className="source">
                      {item.price.sourceName} ·{" "}
                      {item.price.isDelayed ? "延遲" : "即時"}
                    </div>
                  </td>
                  <td>
                    {n(item.price.value)} {item.unit}
                  </td>
                  <td>{n(item.changePercent.value)}%</td>
                  <td>{item.price.marketDate}</td>
                  <td>{item.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card section">
        <h2>核心股票與紀律評分</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>股票</th>
                <th>模擬價格</th>
                <th>進場準備度</th>
                <th>出場警示</th>
                <th>投資理由</th>
                <th>主要風險</th>
              </tr>
            </thead>
            <tbody>
              {report.stocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td>
                    <strong>{stock.name}</strong>
                    <div className="source">{stock.symbol}</div>
                  </td>
                  <td>{n(stock.price.value)}</td>
                  <td>
                    {stock.entry.score} · {stock.entry.label}
                  </td>
                  <td>
                    {stock.exit.score} · {stock.exit.label}
                  </td>
                  <td>{stock.thesisIntact ? "仍待持續驗證" : "需重新檢查"}</td>
                  <td>{stock.majorRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid grid-2 section">
        <div className="card">
          <h2>今日風險雷達</h2>
          <ul className="key-list">
            {report.risks.map((risk) => (
              <li key={risk.name}>
                <strong>{risk.name}</strong>｜機率 {risk.probability}、影響{" "}
                {risk.impact}
                <div className="source">監控：{risk.monitor}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>今日操作紀律</h2>
          <ul className="key-list">
            {report.discipline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <p className="source">
        資料最新時間：
        {new Date(report.latestDataAt).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
        })}{" "}
        · 時區 Asia/Taipei
      </p>
    </>
  );
}
