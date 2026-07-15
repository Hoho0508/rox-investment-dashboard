# Manual Setup Required

這份清單只記錄必須由專案擁有者親自完成的外部授權。未完成前請在本機使用 `DATA_MODE=mock`；網站、報告、技術分析與測試仍可運作。不要把密碼、Token 或資料庫連線字串貼進 Issue、聊天、程式碼或 commit。

## 明天需要手動完成

### GitHub

- [ ] Repository 目前為公開；完成外部檢查後，決定是否維持 Public 或改回 Private。
- [ ] 確認 Codex／本機 Git 只有此 repository 所需的存取權。
- [ ] 若 GitHub 顯示任何未認得的授權，先撤銷再重新授權。

### Vercel

- [ ] 確認 Vercel 專案連接正確的 GitHub repository。
- [ ] 在 Vercel Environment Variables 新增或確認 `FINMIND_API_TOKEN`。
- [ ] 新增或確認 `CRON_SECRET`、`APP_ACCESS_PASSWORD`、`SESSION_SECRET`。
- [ ] 確認資料庫整合提供 `DATABASE_URL`。
- [ ] 完成上述項目後才由你決定是否重新部署；本次本機開發不執行部署。

### FinMind

- [ ] **優先：撤銷先前曾貼在聊天中的 Token；不要再使用舊值。**
- [ ] 建立新 Token 後，在 FinMind 控制台確認新 Token 有效。
- [ ] 確認 `TaiwanStockPrice` 等所需資料集的額度與權限。
- [ ] 只把新 Token 填入自己的 `.env` 或 Vercel Secret，變數名稱固定為 `FINMIND_API_TOKEN`。

### Fugle（選用）

- [ ] 若要盤中即時報價與 1 分 K，確認 Fugle API Key 與行情權限。
- [ ] 只在自己的 `.env` 或部署平台 Secret 設定 `FUGLE_MARKETDATA_API_KEY`。
- [ ] 若暫時不設定，跳過即可；本機使用 Mock Provider，不影響離線開發。

### Database

- [ ] 建立或確認可用的 PostgreSQL 資料庫。
- [ ] 將連線字串存入自己的 `.env`／Vercel Secret：`DATABASE_URL`。
- [ ] 執行 `pnpm db:generate`、`pnpm db:deploy`、`pnpm db:seed`。

## 不需要現在處理

- 美股即時行情、新聞、完整基本面與法人籌碼 Provider 尚未選定，不需要註冊新服務。
- Tick 串流尚未啟用，不需要購買行情方案。
- 本次不修改帳號權限、不購買方案、不部署正式環境。
- Phase 1 僅完成稽核；請不要因文件中的 Phase 2～5 建議先行修改 production。

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
