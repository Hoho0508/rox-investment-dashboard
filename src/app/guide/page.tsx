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
        </ol>
      </div>
    </>
  );
}
