# Test Report

執行日期：2026-07-15。所有驗證均在本機 repository 執行，沒有連線或修改 Vercel Production。

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
