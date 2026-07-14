import { latestOrPreview } from "@/lib/reports/view";

export const dynamic = "force-dynamic";
export default async function StocksPage() {
  const report = await latestOrPreview();
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Core Watchlist</div>
          <h1>核心股票</h1>
          <p className="muted">
            不猜測持股、成本或現金；目前只顯示資料與投資理由狀態。
          </p>
        </div>
      </div>
      <div className="grid grid-3">
        {report.stocks.map((stock) => (
          <article className="card" key={stock.symbol}>
            <div className="eyebrow">{stock.symbol}</div>
            <h2>{stock.name}</h2>
            <div className="metric">{stock.price.value ?? "資料不足"}</div>
            <p>
              展望：{stock.outlook}｜投資理由：
              {stock.thesisIntact ? "仍成立，持續驗證" : "需複核"}
            </p>
            <p className="muted">主要風險：{stock.majorRisk}</p>
            <p className="source">
              {stock.price.sourceName} · {stock.price.marketDate} · 延遲資料
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
