# Rox Investment Dashboard

V2 開發進度見 [`ROADMAP.md`](./ROADMAP.md)；需要專案擁有者親自完成的外部設定集中在 [`SETUP_REQUIRED.md`](./SETUP_REQUIRED.md)。每輪自主巡查記錄於 [`AUTONOMOUS_RUN_LOG.md`](./AUTONOMOUS_RUN_LOG.md)，顯著變更與待核准構想分別記錄於 [`CHANGELOG.md`](./CHANGELOG.md) 與 [`PROPOSALS.md`](./PROPOSALS.md)。

供投資初學者使用的繁體中文市場晨報、資料來源追蹤、條件評分與投資紀律工具。系統不下單、不預測精確價格，也不提供保證獲利的訊號。

## 目前功能

- 每天台灣時間 09:00 產生晨報，交易日 12:30 產生午盤報告、15:00 產生盤後報告
- 可安裝至 iPhone／Android 主畫面的 PWA 手機 App
- 首頁、每日晨報、歷史報告、核心股票、進出場評分、投資日誌、資料狀態與設定頁
- Mock／Manual／Live 三種模式；正式站 Live 採零 Mock 補值，Mock 僅供本機測試
- 台灣時區與週末休市版晨報
- 同一交易日同類報告唯一索引與應用層去重
- Bearer cron 密鑰、固定時間比較、有限重試與工作紀錄
- 集中管理的評分權重、情境機率與風險門檻
- 單人密碼登入與簽章 HttpOnly session cookie
- Neon／PostgreSQL 持久化資料庫與 Vercel 自動 migration
- 全台上市上櫃股票搜尋與私人自選清單
- 台股行情 30 秒更新、來源／時間／延遲／Mock 狀態標示與手動更新
- 60／120／240 日 K 線與成交量圖
- RSI、均線、動能、波動、回撤與成交量分析
- 相似歷史市場情境、後續 5／20／60 日表現與透明進場判斷
- 每檔股票獨立技術分析頁，預設 1 分鐘 K
- 1／5／15／30／60 分鐘與日／週／月 K 切換
- MA、EMA、VWAP、MACD、RSI、KD、ATR、Momentum、OBV、Volume MA、Bollinger 與標準差
- 技術面 0～100 評分、目前位置、支持／反對證據、最大風險與失效條件
- 支撐壓力、研究／突破／回測／風險區間與基礎型態辨識
- 首頁 AI 市場脈動版型；缺少真實族群／新聞資料時清楚標示示範

## 結構

```text
src/app/             Next.js 頁面與 API routes
src/components/      共用 UI
src/lib/config/      評分、情境與風險設定
src/lib/providers/   資料供應商介面與 Mock provider
src/lib/market/      台股清單、盤中行情、K 線與自選清單
src/lib/analysis/    歷史相似情境與透明進場分析
src/lib/technical/   純函式技術指標、評分、位置與型態分析
src/lib/intelligence/ 市場脈動與後續 AI 情報聚合
src/lib/reports/     時區、生成、儲存與排程工作
src/lib/scoring/     進場與出場規則
src/lib/validation/  Zod 輸入驗證
src/types/           領域型別
public/              PWA service worker 與 App 圖示
prisma/              schema 與 seed
scripts/             手動晨報命令
tests/               Vitest 與 Playwright 測試
```

## 本機啟動

需要 Node.js 20.19+、pnpm 與 PostgreSQL 連線。建議先從 Vercel Marketplace 建立 Neon，再將它提供的連線字串放入本機 `.env` 的 `DATABASE_URL`。專案使用 `pnpm-lock.yaml`，不要混用 npm/yarn 或產生其他 lockfile。

不想處理第三方登入時，將 `DATA_MODE=mock` 保持不變即可繼續所有介面與測試開發；缺少 FinMind／Fugle Key 不會讓網站崩潰，也不需要停下來等待授權。

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

開啟 `http://localhost:3000`。若團隊只能使用 npm，可先移除 pnpm lockfile 並由維護者統一遷移；請勿在同一變更中混用兩套 lockfile。

登入功能需要 `APP_ACCESS_PASSWORD` 至少 12 字元，以及獨立且至少 32 字元的 `SESSION_SECRET`。這兩個值只能放在 `.env` 或部署平台 Secret，不得提交 Git。

常用命令：

```bash
pnpm report:generate   # 手動產生並儲存今日晨報
pnpm report:midday    # 手動產生並儲存今日午盤報告
pnpm report:close      # 手動產生並儲存今日盤後報告
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## 排程

排程時區固定為 `Asia/Taipei`。`vercel.json` 使用 UTC cron：晨報 `0 1 * * *`（台灣 09:00）、午盤 `30 4 * * 1-5`（交易日 12:30）、盤後 `0 7 * * 1-5`（交易日 15:00）。流程會取得資料、驗證、生成、儲存並留下 `JobRun`。相同日期與報告類型由資料庫唯一索引避免重複；失敗最多重試 `REPORT_MAX_RETRIES` 次（上限 3）。

登入網站後可直接按「立即產生晨報」。Cron endpoint 也可由管理者手動觸發：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/morning-report

curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/midday-report

curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/closing-report
```

錯誤密鑰回傳 401；內部錯誤只回傳安全訊息，細節記錄於 `JobRun`。可透過 Prisma Studio 查看紀錄：

```bash
pnpm prisma studio
```

重要：本機電腦關機時，本機排程不會執行。要穩定每天生成晨報，必須部署至持續運作的雲端環境。

## Vercel 部署

1. 將私人 GitHub repository 匯入 Vercel。
2. 從 Vercel Marketplace 安裝 Neon，建立 PostgreSQL 並連結專案；整合會提供 `DATABASE_URL`。
3. 在 Vercel Production、Preview 與 Development 設定需要的 server-side 環境變數。
4. 部署時 `vercel-build` 會依序執行 Prisma Client 生成、`prisma migrate deploy` 與 Next.js build。
5. 登入 production 網站並按「立即產生晨報」，確認報告與歷史紀錄可寫入 Neon。
6. Vercel Cron 會依 `vercel.json` 呼叫晨報、午盤與盤後 endpoint。

正式環境變數：

```text
DATABASE_URL=<Neon 自動提供>
FINMIND_API_TOKEN=<重設後的新 Token>
FUGLE_MARKETDATA_API_KEY=<富果行情 API Key；盤中即時行情使用>
CRON_SECRET=<至少 16 字元的隨機密鑰>
APP_ACCESS_PASSWORD=<至少 12 字元的私人密碼>
SESSION_SECRET=<至少 32 字元、與其他密鑰不同>
DATA_MODE=live
REPORT_TIME_ZONE=Asia/Taipei
REPORT_MAX_RETRIES=2
```

部分 Vercel 方案可能限制 cron 頻率或觸發精準度，部署前需確認當前方案規則。也可用 GitHub Actions、Cloud Scheduler 或其他合法排程服務，在台灣時間 09:00 帶 Bearer secret 呼叫同一 endpoint。

## 資料模式與供應商

- `mock`：不需 Key；所有行情明確標示為 Rox Mock Dataset、延遲及模擬資料。
- `manual`：資料庫與 Zod schema 已建立；第一版尚未完成完整輸入 UI，缺漏時降級並提示。
- `live`：正式站嚴格真實資料模式。只有 Fugle、FinMind 或後續合法 Provider 成功回傳的資料才顯示；未串接、逾時或額度不足時顯示「資料 unavailable」與原因，不使用 Mock 補值。

Mock provider 僅供本機開發與自動測試。正式環境 `DATA_MODE=live` 時，報告、市場脈動、即時報價與 K 線都禁止用 Mock 補值；這能避免網站中斷，但缺少正式來源的欄位會保持空白。

Live 報告缺少全球市場正式輸入時，市場方向、波動、模型信心與情境機率會顯示資料不足，不會用固定敘事冒充即時分析。三情境的內部資料契約仍維持合計 100%，但輸入不足時 UI 不顯示該組數字。

## 手機 App

網站提供 PWA manifest、App 圖示與只快取靜態資源的 service worker。登入後前往 `/install`：iPhone／iPad 使用 Safari 的「分享 → 加入主畫面」，Android 使用 Chrome 的「安裝應用程式」。PWA 不快取私人報告、行情或 API 回應，離線時不會拿舊資料冒充即時行情。

台股日成交價由 `src/lib/providers/finmind.ts` 與 `src/lib/market/finmind-market.ts` 透過 FinMind 取得。Token 只讀取 server-side 的 `process.env.FINMIND_API_TOKEN`。晨報缺少 FinMind Token 或 FinMind 暫時失敗時，若已有 `FUGLE_MARKETDATA_API_KEY`，會改用 Fugle 的真實台股報價，並把基本面欄位保持空白；兩個正式來源都不可用時才顯示資料不足。本機 Mock 模式仍可安全降級供測試。FinMind 日資料為盤後更新且標示延遲，不冒充盤中即時行情。

盤中即時台股由 `src/lib/market/fugle.ts` 透過 Fugle Intraday Quote 取得，金鑰只讀取 `process.env.FUGLE_MARKETDATA_API_KEY`。前端永遠只呼叫本站受登入保護的 API route，不會接觸供應商金鑰。行情每 15 至 30 秒更新一次並提供手動更新；自選清單保存於 PostgreSQL。沒有 Fugle Key 時可顯示 FinMind 最新交易日收盤價並標示「延遲行情」；兩者都失敗時正式站顯示資料 unavailable。

分鐘 K 使用 Fugle `GET /intraday/candles/{symbol}`，支援 1／5／15／30／60 分鐘。正式 Live 模式沒有 Fugle Key 或請求失敗時會回傳空資料與原因，不產生模擬 K。日／週／月 K 由 FinMind 日資料取得或聚合。Tick 需要 trades 串流與時序儲存層，尚未啟用並會回傳明確原因。

技術分析 Business Logic 全部位於 `src/lib/technical/`；React Component 只負責資料請求與顯示。技術分數不是買賣指令，輸出限制為「適合開始研究／等待突破／等待回測／風險增加」，並必須附支持證據、反對證據、最大風險、失效條件與信心程度。

Live 串接建議優先評估 TWSE／MOPS 公開資料、公司 IR、SEC、BLS、Federal Reserve／FRED，以及具有明確授權條款的市場與新聞 API。可能需要申請市場資料與新聞 API Key；Key 僅能設於 server-side 環境變數。更換供應商時實作 `src/lib/providers/contracts.ts` 介面，並保留來源、資料日期、擷取時間、延遲狀態、信心與結構化錯誤。

## 評分模型

進場準備度權重：基本面 35、估值 25、市場與產業 15、技術位置 10、投資理由 5、風險管理 10。技術面只作輔助；單日下跌不加分。公司下修展望或自由現金流顯著惡化時，分數設有上限。缺少兩項以上關鍵資料時不高於 64。

出場警示檢查投資理由、展望、EPS／營收、毛利率、自由現金流與集中度。單日漲跌完全不參與計分。所有門檻集中在 `src/lib/config/`。

## 已知限制與下一步

- 未設定或無法連線 Fugle 時，正式站盤中資料會顯示 unavailable；FinMind 日 K 不是盤中即時行情。
- 尚未串接美股即時行情、新聞、經濟日曆或台灣官方交易日行事曆；目前週一至週五視為交易日，國定休市日仍需官方 calendar provider。
- Mock 數值是固定測試資料，不可作為投資依據。
- Manual 模式尚缺完整輸入與修訂 UI；投資日誌第一版提供新增，尚未提供編輯與刪除介面。
- 登入為單一擁有者模式，未提供註冊、多使用者、密碼重設或持久化的登入嘗試限流。
- 尚未實作通知、完整的新聞去重 UI 與持股組合頁。

下一步建議依序完成 Fugle 正式金鑰、官方交易日曆、美股合法行情 Provider、基本面與籌碼面歷史特徵、樣本外回測、Manual 資料管理、新聞事件去重與排程失敗通知。

## 安全與聲明

不要提交 `.env`、真實 API Key、登入密碼、session secret 或 cron secret；不接受任意 URL、不渲染第三方 HTML、不執行使用者程式碼、不串接券商下單 API。若 Token 曾出現在聊天、Issue 或 commit，應立即撤銷並重設。

> 本工具僅供投資學習、資料整理與紀律管理，不構成個人化投資建議。評分與情境分析可能因資料延遲、不完整或模型限制而錯誤。投資可能損失本金。

> 先問為什麼，再問買不買。
