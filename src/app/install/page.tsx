import { InstallApp } from "@/components/install-app";

export default function InstallPage() {
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Mobile App</div>
          <h1>安裝到手機</h1>
          <p className="muted">
            安裝後可從手機主畫面開啟，保留登入、即時台股、K
            線、每日報告與投資日誌。
          </p>
        </div>
        <span className="pill">PWA</span>
      </div>
      <section className="grid grid-2 section">
        <article className="card install-card">
          <h2>安裝 Rox 投資 App</h2>
          <InstallApp />
        </article>
        <article className="card install-card">
          <h2>手機版包含</h2>
          <ul className="key-list">
            <li>台股即時行情與 1 分 K</li>
            <li>晨報、午盤與盤後報告</li>
            <li>技術分析、進出場評分與風險條件</li>
            <li>私人投資日誌與歷史報告</li>
          </ul>
        </article>
      </section>
      <section className="card section">
        <h2>安全提醒</h2>
        <p className="muted">
          App 仍使用同一個私人網站與登入密碼，不會把 API Key
          儲存在手機。離線時不顯示舊行情，避免把快取誤認成即時資料。
        </p>
      </section>
    </>
  );
}
