# Changelog

本專案的顯著變更記錄於此。版本發布前的工作先放在 Unreleased。

## Unreleased

### Beginner Research Center

- 新增近期法說雷達，從公開資訊觀測站讀取上市與上櫃法人說明會，標示日期、來源、抓取時間與部分／完全 unavailable 狀態；Mock 模式不產生假事件。
- 新增新手白話判斷，沿用既有進場分數與正式基本面，輸出支持證據、反對證據、最大風險、失效條件與信心；法說前兩天優先提示先觀察。
- 新增營收、EPS、自由現金流、本益比、RSI 與成交量的白話字典。
- 新增記憶體、AI、IC 晶片、權值股四個研究倉庫，每類固定 10 檔；登入使用者可批次儲存到現有 PostgreSQL 自選股。
- 新增股票倉庫白名單驗證、MOPS parser、事件失敗安全行為與新手判斷測試。

### Production Equity Data and Responsiveness

- 晨報、午盤與盤後核心股票不再以 FinMind Token 為必要條件；Live Factory 依序使用 Fugle、Yahoo Finance Chart 與 TWSE／TPEx 正式行情，全部失敗才回 stale 或 unavailable。
- 新增 Yahoo Finance 延遲 K 線，支援 1／5／15／30／60 分鐘與日／週／月；有 Fugle 或 FinMind 授權時仍優先使用其支援的正式週期。
- 新增 TWSE／TPEx 全市場清單、搜尋與收盤行情 Adapter，以及 NVDA Yahoo Finance 延遲行情。
- 櫃買報價 API 在部署環境暫時不可用時，股票搜尋改讀 TWSE ISIN 公開上櫃清單；Fugle 不接受特定 K 線代號時改用 Yahoo 延遲正式 K，兩者都不會轉 Mock。
- 新增 TWSE 月營收、EPS、毛利率、本益比與 Yahoo 歷史財務 time-series，顯示營收成長、EPS 成長、自由現金流與趨勢；缺少合法分析師一致預期時不捏造預估本益比。
- 午盤與盤後結論改為引用實際市場證據，三種情境機率仍固定合計 100%。
- 報告產生、行情搜尋與更新按鈕加入立即載入回饋、重複請求保護、逾時與錯誤訊息；新增全頁 route loading 狀態。
- Production 部署政策改為：擁有者在當次工作明確授權，且格式、lint、typecheck、單元、桌面／手機 E2E 與 build 全部通過後才可部署；Production 永不使用 Mock。

### Official Cross-Market Context

- 新增免登入、免付費的官方跨市場 Provider：臺灣證券交易所 OpenAPI 提供 TAIEX、臺灣 50、臺灣資訊科技指數；美國財政部 XML Feed 提供 2 年與 10 年公債殖利率。
- Live 晨報以 TAIEX、TWTECH、US10Y 作為最小情境資料門檻，摘要直接引用實際漲跌；任一缺漏仍 fail closed，不用 Mock 或固定敘事補值。
- 部分欄位 unavailable、但已有可用正式資料時，報告保留成功資料的 DELAYED／STALE 模式，不再把整份報告錯標成 unavailable。
- 官方來源失敗時產生逐項 unavailable，若 process-memory 中有上一筆成功資料則由既有 stale wrapper 接手。
- 新增官方 JSON／XML parsing、來源失敗、無 Mock fallback 與 Live 報告可用性的 deterministic tests。

### Phase 2 — Live／Mock Separation

- 新增六態 `DataMode`、統一 `DataEnvelope<T>`、runtime mode resolver、結構化 Provider 錯誤與集中 Provider Factory。
- Production 缺少或誤設 `DATA_MODE` 時改為 fail closed；development 未設定時才預設 Mock。
- 移除 FinMind、Fugle、行情、K 線與晨報路徑中的 Live→Mock 隱性 fallback；Live 失敗僅能回 stale 或 unavailable。
- FinMind 與 Fugle 各自只讀自己的 server-side Key，不互相代用，不把秘密放入錯誤或 response。
- 核心股票 Live snapshot 不再從 Mock template 補 EPS、估值、風險、事件或敘事。
- 新增成功資料的 best-effort process-memory stale cache，並保留 `lastSuccessfulFetchAt`。
- Live runtime 拒絕儲存含 Mock lineage 的正式報告，也拒絕以 Mock K 線產生技術分析。
- 新增共用資料來源 UI，顯示 LIVE／DELAYED／STALE／MANUAL／MOCK／UNAVAILABLE、來源、日期、抓取與錯誤狀態。
- 非 Mock 的市場脈動不再用固定族群、資金流或交易主題補值。
- 更新單元與 E2E 測試，覆蓋 production fail-closed、Mock isolation、stale/unavailable、Token sanitization 與報告儲存限制。

### Audited

- 完成核心資料層、Provider、Live/Mock、技術分析、評分、快取、資料庫、Cron、測試與部署設定的 Phase 1 稽核。
- 新增 `CODE_AUDIT.md`、`DATA_AUDIT.md`、`SECURITY_AUDIT.md`、`REFACTOR_PLAN.md`、`DATA_STATUS_REPORT.md` 與 `TEST_REPORT.md`。
- 記錄 27 項待辦（P0 1、P1 10、P2 13、P3 3）；本階段沒有修改應用程式行為或正式環境。

### Fixed

- 晨報缺少正式全球市場輸入時，不再顯示固定的市場方向、波動、信心、情境百分比或未經資料支持的風險敘事。
- 正式個股基本面為 `null` 時，投資理由欄改顯示「資料不足」，不再誤判為理由失效。
- 報告最新資料時間會從所有可用市場與個股資料計算，不再只依賴全球市場資料。
- 舊版已儲存報告若缺少正式市場輸入，讀取時會安全正規化，不再顯示先前保存的推測性敘事。

### Added

- 報告資料契約新增 `scenarioModelAvailable`，並保留舊報告讀取相容性。
- 新增 Live 資料不足與本機 Mock 降級的單元測試。
- 新增 `SETUP_REQUIRED.md`，集中記錄必須由擁有者親自完成的外部授權與環境設定。

### Changed（Phase 1）

- 晨報台股資料路徑曾使用 FinMind／Fugle；Phase 2 已由嚴格 Factory 取代此跨 Provider fallback，詳見上方最新紀錄。
- 登入後手動產生報告會更新同日同類紀錄；Cron 仍維持同日去重。
