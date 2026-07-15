# Data Status Audit Report

## 現有頁面

`src/app/data-status/page.tsx` 目前只從最新晨報取得全球市場資料，顯示來源、市場日期、擷取時間與簡化的正式/缺少、延遲/即時文字。它不是系統健康狀態頁，也沒有安全的 `/api/data-status` endpoint。

## 覆蓋矩陣

| Dataset       | 現在可見       | Mode | Provider | Market/Fetched | Last success | Error code | Cache |
| ------------- | -------------- | ---- | -------- | -------------- | ------------ | ---------- | ----- |
| 股價          | 部分（報告內） | 部分 | 是       | 部分           | 否           | 否         | 否    |
| 日 K          | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 分 K          | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 大盤/全球市場 | 是             | 簡化 | 是       | 是             | 否           | 否         | 否    |
| 三大法人      | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 基本面        | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 月營收        | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| EPS           | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 新聞          | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 晨報          | 否             | 否   | 否       | 否             | 否           | 否         | 否    |
| 技術分析      | 否             | 否   | 否       | 否             | 否           | 否         | 否    |

## 安全 endpoint 要求

Phase 5 才實作 `/api/data-status`。它必須受 owner session 保護，只回白名單欄位：dataset、mode、provider、marketDate、fetchedAt、lastSuccessfulFetchAt、delay、errorCode、cache status。禁止回 API key/token、database URL、cron/session secret、stack、server path、完整 vendor body。

Phase 1 未新增 endpoint 或修改頁面。
