# Test Report

執行日期：2026-07-15。

## Production 正式股票資料與互動回饋

| Command             | Result | Evidence                                                        |
| ------------------- | ------ | --------------------------------------------------------------- |
| `pnpm format:check` | PASS   | Prettier 全部符合。                                             |
| `pnpm lint`         | PASS   | ESLint 0 warnings。                                             |
| `pnpm typecheck`    | PASS   | TypeScript noEmit 通過。                                        |
| `pnpm test`         | PASS   | 11 files、59 tests。                                            |
| `pnpm test:e2e`     | PASS   | Desktop Chrome + iPhone 13，共 16 tests，22.1 秒。              |
| `pnpm build`        | PASS   | Next.js 16.2.10，17 個頁面與 API routes 完成 production build。 |

`DATA_MODE=live` 的實際網路 smoke test 在未讀取或輸出任何秘密值下成功：晨報、午盤與盤後各在 0.3～0.7 秒完成；2330、NVDA、2317 均取得延遲正式價格，來源為 Yahoo Finance Chart（若正式環境 Fugle 可用則由 Factory 優先選用）。TWSE 與 Yahoo fundamentals 成功取得 EPS、營收成長、EPS 成長、毛利率、自由現金流與歷史／目前本益比，三情境機率各報告均合計 100%。

預估本益比仍為 `null`：它需要具授權的分析師一致預期資料，測試確認程式不會將歷史本益比或 Mock 值冒充預估值。Goodinfo 目前回傳 Cloudflare 人機驗證頁，沒有繞過驗證或將該頁面納入自動化來源。

互動回饋已加入 report generation、行情搜尋與刷新按鈕；開始請求時立即進入 pending 狀態，禁止重複點擊，並提供 timeout／失敗訊息。桌面與手機主要流程均通過。

線上巡查額外發現並修正兩個正式來源邊界：TPEx quote API 在 Vercel 暫時未回資料時，上櫃搜尋會改用 TWSE ISIN 公開清單；Fugle historical candles 對特定代號回 HTTP 400 時，會改用 Yahoo Finance 延遲 K。新增兩項 deterministic regression tests，確認兩條路徑都不會使用 Mock。

## 官方跨市場資料模組

| Command             | Result | Evidence                                                        |
| ------------------- | ------ | --------------------------------------------------------------- |
| `pnpm format:check` | PASS   | Prettier 全部符合（由 `pnpm check` 執行）。                     |
| `pnpm lint`         | PASS   | ESLint 0 warnings（由 `pnpm check` 執行）。                     |
| `pnpm typecheck`    | PASS   | TypeScript noEmit 通過（由 `pnpm check` 執行）。                |
| `pnpm test`         | PASS   | 10 files、53 tests。                                            |
| `pnpm test:e2e`     | PASS   | Desktop Chrome + iPhone 13，共 16 tests，13.3 秒。              |
| `pnpm build`        | PASS   | Next.js 16.2.10，17 個 app pages/routes 完成 production build。 |

另執行一次不含秘密值的實際官方來源 smoke test：TWSE TAIEX／臺灣50／科技指數與 U.S. Treasury 2Y／10Y 均成功取得 2026-07-14 資料並標示 `delayed`。`DATA_MODE=live`、未提供 FinMind Token 的安全驗證結果為：`dataMode=delayed`、`scenarioModelAvailable=true`、`marketView=中性偏空`、`completeness=33`；若正式環境的 FinMind 台股價格同時成功，完整度會再依有效欄位增加。

第一次 smoke test 指令使用 `tsx -e` top-level await，因 CJS eval 模式不支援而在發出網路請求前停止；改用 async function 包裝後成功。這是驗證指令寫法問題，不是 Provider 或應用程式失敗。

## Phase 2 最終結果

| Command             | Result | Evidence                                             |
| ------------------- | ------ | ---------------------------------------------------- |
| `pnpm format:check` | PASS   | Prettier 全部符合（由 `pnpm check` 執行）。          |
| `pnpm lint`         | PASS   | ESLint 0 warnings（由 `pnpm check` 執行）。          |
| `pnpm typecheck`    | PASS   | TypeScript noEmit 通過（由 `pnpm check` 執行）。     |
| `pnpm test`         | PASS   | 9 files、48 tests。                                  |
| `pnpm test:e2e`     | PASS   | Desktop Chrome + iPhone 13，共 16 tests，8.6 秒。    |
| `pnpm build`        | PASS   | Next.js 16.2.10，17 個 app pages/routes 完成 build。 |

E2E 前兩輪因 UI 改為明確顯示 `MOCK` 與 provenance 後，舊文字 locator 失敗；更新測試期待與避免 strict duplicate locator 後，第三輪 16/16 通過。這些是測試同步，不是以略過或降低斷言換取通過。

Build 後掃描 `.next/static`，包含 `FINMIND_API_TOKEN` 或 `FUGLE_MARKETDATA_API_KEY` 名稱的 client bundle 檔案數為 0；Git 追蹤的 `.env`／`.env.local` 檔案數為 0。掃描只比對變數名稱，沒有讀取或輸出任何秘密值。

## Phase 2 新增與修改的覆蓋

- `DATA_MODE=live` 缺 FinMind Token 時為 unavailable，不回 Mock。
- Live FinMind 網路錯誤時為 unavailable，不回 Mock。
- Fugle 缺 Key／請求失敗不產生 Mock 報價或分鐘 K，且錯誤不洩漏 Key。
- `DATA_MODE=mock` 即使設定 Live Key 仍只使用 Mock。
- Production 未設定或設定無效 `DATA_MODE` 時 fail closed 為 unavailable。
- FinMind Live/delayed 股價不混入 Mock EPS、估值、風險或事件敘事。
- 有成功快取時回 stale 並顯示 `lastSuccessfulFetchAt`；無快取時 unavailable。
- Token 不出現在 Provider 回傳內容或結構化錯誤。
- Live 報告缺關鍵資料時 confidence 下降，缺情境輸入時為 0。
- Live runtime 拒絕儲存含 Mock lineage 的報告。
- Live runtime 拒絕用 Mock CandleSeries 產生技術分析。
- Zod `DataMode` schema 與 TypeScript 六態常數一致。
- UI 在桌面與手機顯示來源、日期、擷取時間、延遲、stale／Mock／unavailable 狀態。

## Phase 1 歷史基線

Phase 1 曾通過 format、lint、typecheck、40 項 unit tests、16 項 E2E 與 production build。當時 `pnpm audit --prod` 記錄 1 high Effect 與 1 moderate PostCSS transitive advisory；Phase 2 未變更 dependency 或 lockfile，修補依賴仍應在獨立變更處理。

## 尚未涵蓋

- stale cache 目前為 process memory，尚未測跨 Vercel instance／重啟。
- 完整 `/api/data-status` registry、登入／行情 rate limit、request coalescing 與前端 visibility/backoff 留在後續 Phase。
- ScoreResult validity、全部技術指標 golden fixtures、DB payload version/migration integration 留在 Phase 4～5。
