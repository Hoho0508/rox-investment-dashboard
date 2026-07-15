# Phase 1 Test Report

執行日期：2026-07-15。使用 repository 既有依賴與 Codex bundled Node runtime；沒有連線或修改正式環境。

## 結果

| Command             | Result | Evidence                                                |
| ------------------- | ------ | ------------------------------------------------------- |
| `pnpm format:check` | PASS   | 所有檔案符合 Prettier。                                 |
| `pnpm lint`         | PASS   | ESLint 0 warnings。                                     |
| `pnpm typecheck`    | PASS   | TypeScript noEmit 通過。                                |
| `pnpm test`         | PASS   | 8 files、40 tests。                                     |
| `pnpm test:e2e`     | PASS   | Desktop Chrome + iPhone 13，共 16 tests。               |
| `pnpm build`        | PASS   | Next.js 16.2.10，17 個 app pages/routes 完成 build。    |
| `pnpm audit --prod` | FAIL   | 1 high Effect、1 moderate PostCSS transitive advisory。 |

第一次直接執行 `pnpm check` 時，桌面 shell 的 PATH 沒有 Node，Prettier launcher 回 `node: not found`；載入 Codex bundled Node 後重新執行即全部通過。這是本機工具 PATH 問題，不是 repository 測試失敗。

## 目前覆蓋

- Session、proxy、cron secret、FinMind fallback、報告情境、scoring、技術分析、歷史分析。
- 桌面/手機登入、報告切換、PWA 指引、日誌導覽、行情/K 線/技術頁。

## Phase 2 需修改/新增的測試

1. 改寫「沒有 Token 自動 Mock」為明確 mock mode；production live 缺 key 必須 unavailable。
2. `DATA_MODE=mock` 即使存在 key 也不呼叫 fetch。
3. FinMind/Fugle live failure 不回 Mock；有舊成功 cache 時回 stale。
4. Live quote 不含 Mock fundamental/risk/event。
5. Token/secret 名稱和值不出現在 client/API response。
6. Mock CandleSeries 在 live analysis 被拒絕；歷史分析帶 provenance。
7. 缺資料或 mixed mode scoring 回 invalid，不顯示正式 score。
8. timeout、429、invalid JSON、empty、wrong date/OHLC 的 errorCode matrix。
9. `/api/data-status` 安全白名單與 11 類 dataset。
10. login/report/quote rate limits。
11. DB payload schema、migration、watchlist outage 的 integration tests。
12. visibility/AbortController/backoff/request coalescing 的 fake timer tests。

Phase 1 沒有調整測試程式。
