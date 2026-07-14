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
            live。未設定 Live API Key 時安全降級。
          </p>
        </div>
        <div className="card">
          <h2>每日排程</h2>
          <p>
            固定使用 Asia/Taipei。雲端排程於 UTC 01:00 觸發，即台灣時間 09:00。
          </p>
        </div>
      </div>
    </>
  );
}
