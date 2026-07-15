export default function SettingsPage() {
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Configuration</div>
          <h1>系統設定</h1>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h2>資料模式</h2>
          <p>
            透過伺服器環境變數 <code>DATA_MODE</code> 設定 mock、manual 或
            live。台股盤中即時行情使用 <code>FUGLE_MARKETDATA_API_KEY</code>；
            未設定時改用 Yahoo Finance
            延遲行情與證交所／櫃買中心收盤資料。FinMind 是可選的日 K 來源。正式
            Live 模式缺少來源時顯示 unavailable，不使用模擬值補位。
          </p>
        </div>
        <div className="card">
          <h2>每日排程</h2>
          <p>
            固定使用 Asia/Taipei。晨報、午盤與盤後分別於台灣時間
            09:00、12:30、15:00 觸發。
          </p>
        </div>
        <div className="card">
          <h2>行情標示</h2>
          <p>
            所有價格必須顯示即時、已收盤、延遲、stale 或 unavailable
            狀態，以及資料來源與更新時間。正式站禁止 Mock 補值；Yahoo
            公開資料一律保守標示為延遲。
          </p>
        </div>
        <div className="card">
          <h2>分析模型</h2>
          <p>
            相似歷史情境採價格、RSI、波動、回撤與均線距離比較；結果是統計參考，不是預測或自動交易訊號。
          </p>
        </div>
      </div>
    </>
  );
}
