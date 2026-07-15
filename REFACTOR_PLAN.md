# Core Data and Technical Refactor Plan

本計畫依附件要求分階段執行。Phase 1 稽核與 Phase 2 Live／Mock 資料分離已完成；下一階段為 Phase 3 Provider 效能與持久 stale cache。

## 原則

- 不重寫專案，不改 UI 主題，不刪正式資料。
- 先加 compatibility adapter 與測試，再逐條切換呼叫端。
- 每個 phase 一個窄範圍 commit，通過 check/build；使用者可見變更再跑 E2E。
- Live 不回 Mock；Mock 不碰 Live；Manual 不被固定數值補齊。
- 所有分析先驗證 lineage，再計算分數。

## Phase 2：修復模式與 fallback（已完成，2026-07-15）

### 2.1 集中 runtime mode

- [x] 新增 `src/lib/config/data-mode.ts`。
- [x] Zod 驗證 `DATA_MODE` 與 production fail-closed 規則。
- [x] 提供集中 resolver 與 `isProductionRuntime()`，移除應用程式內散落的直接判斷。
- [x] 建立六態 DataMode、DataEnvelope 與舊 DataPoint compatibility alias。

### 2.2 移除隱性 fallback

- [x] Provider factory 依模式選 provider，不由 provider 捕捉後改走 Mock。
- [x] live failure 僅回 stale（有 process-memory 成功快取）或 unavailable。
- [x] mock 模式即使存在 key 也不呼叫 Live API。
- [x] 拆除 Live stock 上的 Mock fundamental/risk/event template。

### 2.3 分析/評分閘門

- [x] Live 模式拒絕 Mock K 線進技術分析。
- [x] Live 報告關鍵資料 unavailable 時降低 confidence；Mock lineage 不得以正式報告儲存。
- [ ] ScoreResult 增加 validity、dataMode、missingInputs；此評分契約調整留在 Phase 4，避免本階段改變評分邏輯。

### 2.4 測試

- [x] production missing/invalid mode、mock with key、FinMind/Fugle failure、stale/unavailable、mixed snapshot、Mock analysis rejection與模式 schema 一致性。

**Phase 2 驗收：** 全 repo 模式判斷集中；live 路徑 0 個 Mock fallback；舊頁面可運作；實際命令結果記錄於 `TEST_REPORT.md`。

## Phase 3：Provider 效能、持久快取與限流（下一階段）

建議先建立新目錄並用 adapter 漸進遷移：

```text
src/lib/providers/
  contracts.ts
  provider-factory.ts
  errors.ts
  cache.ts
  finmind/client.ts
  finmind/quotes.ts
  finmind/candles.ts
  fugle/client.ts
  fugle/quotes.ts
  fugle/candles.ts
  mock/quotes.ts
  mock/candles.ts
  unavailable/index.ts
```

- 已完成基礎結構化錯誤、timeout、status、429、invalid response、empty 與 OHLC 驗證；下一步抽成共用 HTTP client。
- 將 Phase 2 的 process-memory stale-if-error 升級為跨 serverless instance 的持久 cache；補齊 TTL policy 與 request coalescing。
- 前端 polling：visibility、market hours、AbortController、exponential backoff、Retry-After。
- 登入、報價與手動產報 rate limit。

**Phase 3 驗收：** 每類 dataset 只有一個選擇路徑；重複 K 線請求合併；錯誤皆有 errorCode；stale 顯示 last success。

## Phase 4：技術分析與評分

```text
src/lib/technical/
  types.ts
  sma.ts
  ema.ts
  rsi.ts
  macd.ts
  kd.ts
  atr.ts
  bollinger.ts
  volume.ts
  support-resistance.ts
  trend.ts
  analyze.ts
  index.ts

src/lib/scoring/
  config.ts
  types.ts
  fundamental.ts
  valuation.ts
  technical.ts
  institutional.ts
  risk.ts
  entry.ts
  exit.ts
  index.ts
```

- 每個指標為 deterministic pure function，回 value + warm-up/availability。
- 明訂 RSI/ATR/KD/VWAP 公式及 anchor，拒絕 NaN/Infinity/zero invalid input。
- 用固定 OHLCV fixture 與獨立計算結果做 golden tests。
- 型態辨識獨立測試；歷史相似樣本採不重疊與 embargo。
- 所有評分權重集中；缺資料與混合來源先決定 validity，再談 score。

**Phase 4 驗收：** 指標公式 fixture 通過；Mock 不產生正式評分；單一指標不能產生進出場結論；輸出含支持、反對、風險、失效條件。

## Phase 5：Data Status、DB 與完整驗證

- 建立登入保護 `/api/data-status` 與 dataset status registry。
- 顯示 11 類資料的 mode/provider/date/fetch/last success/delay/error/cache。
- StoredReport schema version + Zod read validation；DB error 與 preview 分開。
- 評估 Decimal/enum migration，先備份與 dry-run。
- 官方交易日曆、job deadline/lock。
- 全站安全 headers、Origin 驗證與 CI。
- 執行 check、所有 E2E、production build、production audit；只更新文件，不部署。

**Phase 5 驗收：** 附件列出的 16 項測試全部有證據；Data Status 不含秘密；migration 有回滾說明；使用者核准後才安排 production。

## Commit 建議

1. `docs: audit core data architecture`（本 Phase 1）
2. `refactor: enforce strict runtime data modes`
3. `refactor: centralize market provider selection`
4. `refactor: add provider errors cache and rate limits`
5. `refactor: validate technical analysis provenance`
6. `refactor: modularize indicators and scoring`
7. `feat: expose safe data status diagnostics`

## 回滾策略

- 每 phase 保留舊介面 adapter，直到新介面測試與呼叫端全部切換。
- DB 變更獨立 phase、先備份與 shadow/dry-run；不在 Provider 重構 commit 混入 migration。
- 不以大量 rename 同時改行為；每個 commit 可單獨 revert。
