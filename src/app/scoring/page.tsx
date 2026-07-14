import { latestOrPreview } from "@/lib/reports/view";

export const dynamic = "force-dynamic";
export default async function ScoringPage() {
  const report = await latestOrPreview();
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Rules, not signals</div>
          <h1>進出場評分</h1>
          <p className="muted">單日漲跌不會單獨提高進場分數或觸發出場警示。</p>
        </div>
      </div>
      <div className="grid grid-3">
        {report.stocks.map((stock) => (
          <article className="card" key={stock.symbol}>
            <h2>
              {stock.name} {stock.symbol}
            </h2>
            <div className="grid grid-2">
              <div>
                <div className="label">進場準備度</div>
                <div className="metric">{stock.entry.score}</div>
              </div>
              <div>
                <div className="label">出場警示</div>
                <div className="metric">{stock.exit.score}</div>
              </div>
            </div>
            <p>{stock.entry.label}</p>
            <p className="muted">最大風險：{stock.entry.biggestRisk}</p>
            {stock.entry.missing.length > 0 && (
              <p className="notice">
                資料不足：{stock.entry.missing.join("、")}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
