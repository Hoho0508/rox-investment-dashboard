# Changelog

本專案的顯著變更記錄於此。版本發布前的工作先放在 Unreleased。

## Unreleased

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
