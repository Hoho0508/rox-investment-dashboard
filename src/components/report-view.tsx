import Link from "next/link";
import type { DailyReport } from "@/types/domain";
import { GenerateReportButton } from "@/components/generate-report-button";
import { REPORT_DEFINITIONS, REPORT_TYPES } from "@/lib/reports/config";
import { DATA_MODE_LABELS, DataProvenance } from "@/components/data-provenance";

const n = (value: number | null) =>
  value === null
    ? "資料不足"
    : new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(
        value,
      );

export function ReportView({ report }: { report: DailyReport }) {
  const definition = REPORT_DEFINITIONS[report.reportType];
  return (
    <>
      <nav className="report-tabs" aria-label="每日報告種類">
        {REPORT_TYPES.map((reportType) => (
          <Link
            href={`/reports?type=${reportType}`}
            className={report.reportType === reportType ? "active" : ""}
            key={reportType}
          >
            {REPORT_DEFINITIONS[reportType].label}
            <small>{REPORT_DEFINITIONS[reportType].taipeiTime}</small>
          </Link>
        ))}
      </nav>
      <div className="topline">
        <div>
          <div className="eyebrow">{definition.eyebrow}</div>
          <h1>
            {report.isTradingDay
              ? definition.title
              : `台股休市版${definition.label}`}
          </h1>
          <p className="muted">
            報告日期 {report.reportDate} · 產生於{" "}
            {new Date(report.generatedAt).toLocaleString("zh-TW", {
              timeZone: "Asia/Taipei",
            })}
          </p>
        </div>
        <span className="pill">{DATA_MODE_LABELS[report.dataMode]}</span>
      </div>
      <GenerateReportButton reportType={report.reportType} />
      {report.dataMode === "mock" && (
        <div className="notice">
          目前顯示模擬資料，不代表真實市場行情；請以正式來源確認後再做判斷。
        </div>
      )}
      {report.dataMode === "unavailable" && (
        <div className="notice">
          正式站已停用 Mock
          補值；缺少合法資料來源的欄位會保持空白。可用的台股資料仍標示 Fugle 或
          FinMind 來源。
        </div>
      )}
      {report.dataMode === "stale" && (
        <div className="notice">
          目前顯示上一筆成功資料（STALE）；請查看每項上次成功時間與錯誤狀態。
        </div>
      )}
      {report.dataMode === "delayed" && (
        <div className="notice">目前資料為 DELAYED，不是盤中即時行情。</div>
      )}
      <section className="grid grid-4 section">
        <div className="card">
          <div className="label">今日市場判斷</div>
          <div className="metric">{report.marketView}</div>
        </div>
        <div className="card">
          <div className="label">規則模型信心</div>
          <div className="metric">
            {report.scenarioModelAvailable ? report.confidence : "—"}
          </div>
          <div className="source">
            {report.scenarioModelAvailable ? "滿分 100" : "資料不足，未評分"}
          </div>
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
              <div className="metric">
                {report.scenarioModelAvailable ? `${item.probability}%` : "—"}
              </div>
              <div className="bar">
                <span
                  style={{
                    width: report.scenarioModelAvailable
                      ? `${item.probability}%`
                      : "0%",
                  }}
                />
              </div>
              <p>{item.trigger}</p>
              <p className="source">核心影響：{item.coreImpact}</p>
            </article>
          ))}
        </div>
        <p className="source">
          {report.scenarioModelAvailable
            ? "情境為規則模型推估，不是保證；三種機率合計 100%。"
            : "正式輸入資料不足，情境機率暫不顯示，也不做方向推估。"}
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
              {report.globalMarkets.length ? (
                report.globalMarkets.map((item) => (
                  <tr key={item.symbol}>
                    <td>
                      {item.name}
                      <div className="source">
                        <DataProvenance {...item.price} />
                      </div>
                    </td>
                    <td>
                      {n(item.price.value)} {item.unit}
                    </td>
                    <td>{n(item.changePercent.value)}%</td>
                    <td>{item.price.marketDate}</td>
                    <td>{item.impact}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    全球市場正式資料 Provider 尚未串接，未顯示模擬數值。
                  </td>
                </tr>
              )}
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
                <th>最新價格</th>
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
                  <td>
                    {n(stock.price.value)}
                    <DataProvenance {...stock.price} />
                  </td>
                  <td>
                    {stock.entry.score} · {stock.entry.label}
                  </td>
                  <td>
                    {stock.exit.score} · {stock.exit.label}
                  </td>
                  <td>
                    {stock.thesisIntact === null
                      ? "資料不足"
                      : stock.thesisIntact
                        ? "仍待持續驗證"
                        : "需重新檢查"}
                  </td>
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
      {report.missingData.length > 0 && (
        <section className="card section">
          <h2>尚缺的正式資料</h2>
          <ul className="key-list">
            {report.missingData.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
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
