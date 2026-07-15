export default function GuidePage() {
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Guide</div>
          <h1>使用說明</h1>
        </div>
      </div>
      <div className="card">
        <h2>閱讀順序</h2>
        <ol className="key-list">
          <li>先確認資料模式、日期、來源與完整度。</li>
          <li>閱讀 30 秒摘要與三情境，不把機率當作預測保證。</li>
          <li>檢查核心股票的投資理由與最大風險。</li>
          <li>交易前在日誌回答完整問題，避免 FOMO 與單日行情驅動。</li>
          <li>在「即時台股與 K 線」搜尋任何上市上櫃股票並加入自選。</li>
          <li>
            先查看行情狀態與更新時間，再閱讀 K 線、硬性風險門檻及相似歷史情境。
          </li>
          <li>相似歷史只描述過去樣本，不代表未來必然重演。</li>
        </ol>
      </div>
    </>
  );
}
