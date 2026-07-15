# Security Audit

稽核日期：2026-07-15。僅做本機 repository、Git history、build artifact 與程式設定檢查；沒有登入第三方、讀取正式環境變數、顯示或修改任何 Token。

## 結果摘要

- Git 追蹤的敏感型檔名只有 `.env.example`；內容為 placeholder。
- Git history JWT 格式掃描沒有命中。
- `.next/static` 對 `FINMIND_API_TOKEN`、`FUGLE_MARKETDATA_API_KEY`、`CRON_SECRET`、`SESSION_SECRET`、`DATABASE_URL` 名稱的掃描皆為 0 個檔案。
- 行情金鑰只在 server-side module 讀取，client components 只呼叫本站 API。
- 未發現硬編碼 Token、密碼或 database URL；泛化 pattern 命中均為環境變數名稱、placeholder 或安全說明，未發現真實值。
- 先前聊天曾出現 FinMind credential，必須由擁有者撤銷；本文件不保存其內容。

## 認證與授權

### 已有防護

- `src/proxy.ts` 預設保護頁面與一般 API，只公開 login 與三個 Cron endpoint。
- Session 使用 HMAC-SHA256，驗證 scope 與期限；secret 少於 32 字元會 fail closed。
- Cookie 為 HttpOnly、SameSite Strict，production 啟用 Secure。
- APP_ACCESS_PASSWORD 少於 12 字元時拒絕登入，密碼以 `timingSafeEqual` 比較。
- Cron secret 使用固定時間比較；缺少 secret 時拒絕。
- API 驗證失敗不回 stack trace；service worker 不快取私人資料。

### 風險

1. **P0：外部暴露的 FinMind credential。** 需人工撤銷重發。
2. **P1：登入、報告與行情沒有 rate limit。** 單人網站仍可能遭暴力登入或額度消耗。
3. **P1：production data mode 未 fail closed。** 不是傳統入侵，但會破壞投資資料完整性。
4. **P1：production dependency audit 有 1 high、1 moderate。** Effect advisory 位於 Prisma transitive path；PostCSS advisory 位於 Next transitive path。需在 Phase 2 前後安排相容升級與再稽核。
5. **P2：全站安全 headers 不完整。** `next.config.ts` 只有 `/sw.js` CSP；沒有全站 HSTS、nosniff、Referrer-Policy、Permissions-Policy。CSP 應先 report-only 驗證。
6. **P2：cookie mutation 沒有 Origin/Host 驗證。** SameSite Strict 已降低跨站風險，但同站子網域與縱深防禦仍不足。
7. **P2：供應商錯誤訊息會進 UI/JobRun。** 應用 errorCode 與安全訊息取代 vendor 原文。

## 依賴稽核

`pnpm audit --prod`：失敗（2 advisories）。

| Severity | Package            | Path                                | 建議                                                                |
| -------- | ------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| High     | `effect < 3.20.0`  | Prisma config transitive dependency | 驗證可用 Prisma patch/minor，升級後跑 migration、unit、E2E、build。 |
| Moderate | `postcss < 8.5.10` | Next transitive dependency          | 以 Next 支援版本修補，不使用 override 強壓未驗證版本。              |

## Phase 2 安全驗收

- Production 無效/缺少 DATA_MODE 時不可能回 Mock。
- 任何 API 回應、log、error、data-status 都不含秘密、stack 或 server path。
- Login/report/quotes 超額時回 429 與 Retry-After。
- 全站 header 與 Origin 檢查有自動測試。
- `pnpm audit --prod` 不含 high；其餘風險有書面接受與期限。
