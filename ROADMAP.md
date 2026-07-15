# Rox Investment Dashboard V2 Roadmap

V2 的目標是建立可驗證、可解釋、可回測的 AI 投資研究平台。所有功能皆遵守：資料來源透明、Mock 不冒充正式資料、分析必須列出支持／反對證據、最大風險、失效條件與信心程度；系統不自動下單，也不保證獲利。

## Core Foundation Refactor（優先於新功能）

- [x] Phase 1：完整資料流、秘密、Provider、技術分析、評分、DB、Cron 與測試稽核
- [x] Phase 2：六態 DataMode、production fail-closed、Provider factory、結構化錯誤、best-effort stale cache 與移除隱性 Mock fallback
- [ ] Phase 3：跨 instance stale cache、限流、重試退避與請求合併
- [ ] Phase 4：技術指標與進出場評分模組化、provenance gate 與 golden tests
- [ ] Phase 5：安全 Data Status API、DB 契約、完整測試與 build

詳細順序與驗收見 [`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md)。完成 Core Foundation P0～P2 前，不開始市場輪動、新聞時間軸、策略回測或新的 AI 功能。

## Phase 1：技術分析中心與分鐘 K（進行中）

- [x] 每檔股票獨立網址與技術分析工作區
- [x] K 線週期資料契約與嚴格 Provider 選擇
- [x] 1／5／15／30／60 分鐘 K，日／週／月 K 切換
- [x] 正式 Live 模式沒有 Fugle Key 時改用 Yahoo 延遲 K；全部正式來源失敗才顯示 unavailable，且不產生模擬 K
- [x] MA5／10／20／60／120／240
- [x] EMA20／60／120／240
- [x] VWAP、MACD、RSI、KD、ATR、Momentum
- [x] Volume、OBV、Volume MA、Bollinger Bands、Standard Deviation
- [x] 技術面 0～100 評分與支持／扣分原因
- [x] 市場位置辨識與研究／觀察／停利／風險區間
- [x] 基礎支撐、壓力、前高、前低與均線位置
- [ ] Tick K：待 Fugle trades 權限與串流儲存層
- [ ] Ichimoku、CCI、MFI、ADX、Volume Profile
- [ ] 完整 W 底、M 頭、頭肩、旗形、楔形、圓弧型態辨識
- [ ] 日／週／月多週期聯合評分

## Phase 2：市場情報首頁與分類中心

- [x] AI 市場脈動首頁資料契約與模擬展示
- [x] 晨報、午盤、盤後三時段報告與自動排程
- [x] 正式環境嚴格真實資料模式；缺資料不使用 Mock 補值
- [x] Live 報告輸入不足時隱藏方向、信心與情境機率，不以固定敘事冒充分析
- [x] TWSE TAIEX／臺灣50／科技指數與 U.S. Treasury 2Y／10Y 官方延遲資料
- [x] 舊版已儲存報告讀取時套用相同的資料不足安全規則
- [x] 晨報核心股票使用 Fugle／Yahoo／TWSE／TPEx 正式 Provider；FinMind 不再是必要條件，失敗時只回 stale 或 unavailable
- [x] 晨報、午盤與盤後顯示 TWSE／Yahoo 歷史基本面；預估本益比缺授權時保持空白
- [x] iPhone／Android 可安裝 PWA 與手機安全區版面
- [ ] 真實市場情緒、族群強弱與資金流 Provider
- [ ] 新聞事件去重、主題聚類與「市場正在交易什麼」分析
- [ ] 預設產業分類與使用者自訂分類
- [ ] 分類漲跌幅、成交量、市值、強弱與資金流頁面
- [ ] 盤中雷達 30／60／120 秒設定

## Phase 3：股票研究與六大評分

- [ ] 基本面、估值、新聞、法人、籌碼與重大公告 Provider
- [ ] 歷史營收、EPS、毛利率、自由現金流、ROE、ROA、PE、PB、殖利率
- [x] MOPS 近期法說雷達與法說前風險提示
- [ ] 個股完整法說會與重大事件歷史時間軸
- [ ] 基本面／技術面／估值／籌碼／市場情緒／風險六大分數
- [ ] 綜合評分、證據、反證、失效條件與信心校準

## Phase 4：自選、分類與投資組合

- [x] PostgreSQL 自選清單
- [x] 記憶體、AI、IC 晶片、權值股四類各 10 檔研究倉庫與批次加入自選
- [ ] 持股／觀察／想買／已賣出／黑名單狀態與自訂標籤
- [ ] 總資產、今日損益、未／已實現損益、報酬率
- [ ] 持股比例、風險比例、集中度與過度集中提醒
- [x] NVIDIA Yahoo Finance 延遲行情與歷史基本面 Provider
- [ ] 具合約授權保證的美股逐筆即時行情 Provider

## Phase 5：策略實驗室與 AI 回測

- [ ] MA／RSI／MACD／成交量／法人／月營收／EPS 規則組合器
- [ ] 全市場條件掃描
- [ ] 每個訊號記錄 5／10／20／60／120 日報酬
- [ ] 勝率、最大回撤、平均／中位報酬
- [ ] 樣本內／樣本外切分、walk-forward 與交易成本
- [ ] 模型版本、資料版本與結果可重現性

## 外部資料與認證待辦

人工登入、授權與環境變數步驟統一記錄於 [`SETUP_REQUIRED.md`](./SETUP_REQUIRED.md)；未完成時一律以本機 Mock／Adapter Stub 繼續開發，不阻塞離線功能。

- Fugle：台股盤中 Quote、K 線與未來 WebSocket；需使用者親自同意條款並設定 `FUGLE_MARKETDATA_API_KEY`，沒有 Key 時使用延遲正式來源。
- FinMind：日／週／月 K 可選來源；只讀取 `FINMIND_API_TOKEN`，舊的已暴露 Token 不使用。
- 免登入正式來源：Yahoo Finance Chart／fundamentals、TWSE／TPEx OpenAPI、U.S. Treasury Feed。
- 新聞、法人／籌碼、分析師一致預期與具合約授權的美股即時行情：Provider 尚待選定，金鑰只存 Vercel Secrets。
