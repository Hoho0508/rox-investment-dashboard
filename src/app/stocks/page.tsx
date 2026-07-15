import { MarketWorkspace } from "@/components/market-workspace";
import { getWatchlist } from "@/lib/market/watchlist";

export const dynamic = "force-dynamic";
export default async function StocksPage() {
  const watchlist = await getWatchlist();
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Live market workspace</div>
          <h1>台股即時追蹤與數據分析</h1>
          <p className="muted">
            搜尋上市上櫃股票、建立自選清單，並用 K
            線與相似歷史情境檢查進場邏輯。
          </p>
        </div>
      </div>
      <p className="notice">
        即時行情與歷史分析是兩個獨立資料層；每張卡片都會標示來源、時間與是否為模擬或延遲資料。
      </p>
      <MarketWorkspace
        initialWatchlist={watchlist.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          exchange: item.exchange,
        }))}
      />
    </>
  );
}
