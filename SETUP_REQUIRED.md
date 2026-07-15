# Manual Setup Required

這份清單只記錄必須由專案擁有者親自完成的外部授權。未完成前請在本機明確使用 `DATA_MODE=mock`；網站、報告、技術分析與測試仍可運作。不要把密碼、Token 或資料庫連線字串貼進 Issue、聊天、程式碼或 commit。

## 明天需要手動完成

### GitHub

- [ ] Repository 目前為公開；完成外部檢查後，決定是否維持 Public 或改回 Private。
- [ ] 確認 Codex／本機 Git 只有此 repository 所需的存取權。
- [ ] 若 GitHub 顯示任何未認得的授權，先撤銷再重新授權。

### Vercel

- [ ] 確認 Vercel 專案連接正確的 GitHub repository。
- [ ] 若要使用 FinMind 日 K，可選擇在 Vercel Environment Variables 新增新的 `FINMIND_API_TOKEN`；正式晨報與 Yahoo K 線不再以它為必要條件。
- [ ] 新增或確認 `CRON_SECRET`、`APP_ACCESS_PASSWORD`、`SESSION_SECRET`。
- [ ] 確認資料庫整合提供 `DATABASE_URL`。
- [ ] **明確設定 `DATA_MODE=live`。** Production 未設定或拼錯時現在會 fail closed，所有行情顯示 unavailable，不會偷偷啟用 Mock。
- [x] 專案擁有者已明確允許本次通過完整驗證後重新部署 Production。

### FinMind（選用）

- [ ] **優先：撤銷先前曾貼在聊天中的 Token；不要再使用舊值。**
- [ ] 建立新 Token 後，在 FinMind 控制台確認新 Token 有效。
- [ ] 確認 `TaiwanStockPrice` 所需資料集的額度與權限；目前主要用途為日／週／月 K 的可選來源。
- [ ] 只把新 Token 填入自己的 `.env` 或 Vercel Secret，變數名稱固定為 `FINMIND_API_TOKEN`。

### Fugle（選用）

- [ ] 若要盤中即時報價與 1 分 K，確認 Fugle API Key 與行情權限。
- [ ] 只在自己的 `.env` 或部署平台 Secret 設定 `FUGLE_MARKETDATA_API_KEY`。
- [ ] 若暫時不設定，跳過即可；Live 模式會改用 Yahoo 延遲行情／K 線與 TWSE／TPEx 收盤資料，不會改成 Mock。

### Database

- [ ] 建立或確認可用的 PostgreSQL 資料庫。
- [ ] 將連線字串存入自己的 `.env`／Vercel Secret：`DATABASE_URL`。
- [ ] 執行 `pnpm db:generate`、`pnpm db:deploy`、`pnpm db:seed`。

## 不需要現在處理

- 公開資訊觀測站法人說明會一覽表不需要帳號、Token 或付費設定；部署環境只需允許 outbound HTTPS。來源暫時失敗時會顯示 unavailable，不會用模擬事件補值。
- TWSE OpenAPI 與 U.S. Treasury XML Feed 不需要帳號、Token 或付費設定；部署環境只需允許正常的 outbound HTTPS。
- Yahoo Finance Chart 與 fundamentals、TWSE／TPEx OpenAPI、U.S. Treasury Feed 不需要新增帳號或 Token；部署環境只需允許 outbound HTTPS。
- 美股逐筆即時行情、分析師一致預期、新聞與法人籌碼 Provider 尚未選定，不需要註冊新服務。
- Tick 串流尚未啟用，不需要購買行情方案。
- 本次不修改帳號權限、不購買方案、不建立或重設 Token；只在完整驗證通過後部署已獲授權的程式碼。
- process-memory stale cache 不需要外部帳號，但不能跨 Vercel instance 保證保留；持久 cache 留待 Phase 3 設計。

## 本機 Mock 啟動

```bash
cp .env.example .env
# 將 DATA_MODE 保持為 mock，並填入你自己的 PostgreSQL 與本機登入安全值
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Mock 資料會在介面明確標示，不可作為真實市場行情或投資依據。
