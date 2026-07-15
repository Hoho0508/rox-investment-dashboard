# Changelog

本專案的顯著變更記錄於此。版本發布前的工作先放在 Unreleased。

## Unreleased

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

### Changed

- 晨報缺少 FinMind 或 FinMind 暫時失敗時，優先使用已設定的 Fugle 真實台股報價；Fugle 行情不會混入 Mock 基本面。
- 登入後手動產生報告會更新同日同類紀錄；Cron 仍維持同日去重。
