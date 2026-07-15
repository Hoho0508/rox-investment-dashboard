# Data Audit

更新日期：2026-07-15。Phase 2 已完成 Live／Mock 資料分離；本文件描述目前程式行為，不代表正式環境已部署。

## 統一資料契約

所有對外市場資料使用六態 `DataMode`：`live`、`delayed`、`stale`、`manual`、`mock`、`unavailable`。`DataEnvelope<T>` 統一攜帶值、來源、來源網址、市場日期、擷取時間、最後成功時間、延遲狀態、信心與結構化錯誤。

Runtime 模式只由 `src/lib/config/data-mode.ts` 解析，Provider 選擇只由 `src/lib/providers/provider-factory.ts` 執行：

- 明確 `DATA_MODE=mock`：只選 Mock Provider，不呼叫 Live API。
- 明確 `DATA_MODE=manual`：只讀手動資料；缺資料為 `unavailable`。
- 明確 `DATA_MODE=live`：只選 Live Provider；失敗時有成功快取才回 `stale`，否則回 `unavailable`。
- development 未設定：預設 `mock`。
- production 未設定或值無效：fail closed 為 `unavailable`，不預設 Mock。

## 已移除的隱性 Mock fallback

| 路徑                           | Phase 2 結果                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `providers/finmind.ts`         | 移除注入的 Mock provider；FinMind 缺 Token、失敗或資料異常只回 unavailable。    |
| `providers/index.ts`           | 不再自行解析環境變數或建立 fallback，改委派 Provider Factory。                  |
| `market/finmind-market.ts`     | 搜尋、延遲報價與日 K 不再用 Mock 名稱、價格或 K 線補值。                        |
| `market/fugle.ts`              | 缺 Key 或 API 失敗不再回 Mock quote／分鐘 K。                                   |
| `market/index.ts`              | Live 路徑不會呼叫 mock candles；不支援的週期直接 unavailable，日 K 不冒充分 K。 |
| `providers/core-stocks.ts`     | 核心股票只保留靜態識別資料；不含 Mock EPS、估值、風險或事件敘事。               |
| `intelligence/market-pulse.ts` | 固定族群與資金流只在 Mock 模式展示；其他模式缺來源時明示資料不足。              |
| `reports/store.ts`             | Live／production fail-closed 模式拒絕儲存任何含 Mock lineage 的正式報告。       |

## 目前資料能力

| 資料集                           | 來源與狀態                             | 無來源時的行為                                         |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| 台股盤中報價                     | Fugle；成功為 `live`                   | 缺 Key／失敗為 unavailable；成功快取存在時為 stale。   |
| 台股盤後收盤價                   | FinMind；標示 `delayed`                | 缺 Token／失敗為 unavailable；成功快取存在時為 stale。 |
| 台股清單與搜尋                   | FinMind；延遲資料                      | 缺 Token／失敗為 unavailable，不用 Mock 名稱補值。     |
| 台股日／週／月 K                 | FinMind 日資料或其聚合；`delayed`      | 缺 Token／失敗為 unavailable；成功快取存在時為 stale。 |
| 台股 1／5／15／30／60 分 K       | Fugle                                  | 缺 Key／不支援／失敗為 unavailable；不產生模擬分 K。   |
| Tick                             | 尚無合法 Provider／儲存層              | unavailable。                                          |
| 手動價格                         | PostgreSQL `ManualDataPoint`；`manual` | 查無資料為 unavailable。                               |
| 全球市場與美股                   | 尚無正式 Provider                      | unavailable。                                          |
| EPS、營收、估值、現金流          | 尚無正式 Provider                      | null／資料不足，不與真實股價混成完整 Live snapshot。   |
| 法人、新聞、族群資金流、經濟日曆 | 尚無正式 Provider                      | unavailable，不用固定敘事補值。                        |
| Mock 展示資料                    | Rox Mock Dataset                       | 僅在 `DATA_MODE=mock` 可使用，所有主要卡片明示 MOCK。  |

## stale 與 unavailable

目前報價、報告核心台股資料與 K 線提供「最後一次成功資料」的 process-memory cache。Live 請求失敗時：

1. 有符合資料集／股票／週期的成功快取：回 `stale`，保留原來源與 `lastSuccessfulFetchAt`，同時附錯誤碼。
2. 沒有快取：回 `unavailable`，`value` 為 null 或 series 為空。

此快取是單一 server process 的 best-effort 保護；Vercel serverless instance 重啟或切換 instance 後不保證存在。跨 instance 持久 stale cache、request coalescing 與完整 TTL policy 留在 Phase 3。

## 報告與分析保護

- 報告整體模式由所有資料包的 lineage 推導；任何 Mock 輸入都會讓報告明確標示 Mock。
- Live 報告若缺少關鍵資料，不產生高信心結論；情境模型不可用時 confidence 為 0，其他 stale／manual／delayed 亦有上限。
- Live runtime 儲存報告前會拒絕 Mock lineage。
- 技術分析在 Live／production fail-closed runtime 會拒絕 Mock CandleSeries。
- UI 透過共用 provenance 元件顯示模式、來源、市場日期、擷取時間、上次成功時間、延遲與錯誤；Mock 與 unavailable 另有文字警告。

## Token 邊界

- FinMind 只讀 server-side `process.env.FINMIND_API_TOKEN`。
- Fugle 只讀 server-side `process.env.FUGLE_MARKETDATA_API_KEY`。
- 兩個 Token 不互相替代，不進入 API response、Provider 錯誤或 client component。
- `.env.local` 不應被 Git 追蹤；`.env.example` 僅有空值或明確假值。

## 尚待處理

1. Phase 3：跨 instance stale cache、request coalescing、完整 rate limit 與 Retry-After/backoff。
2. Phase 4：所有指標 golden fixture、ScoreResult validity／missingInputs 與歷史分析完整 provenance。
3. Phase 5：受登入保護的完整 `/api/data-status` registry、DB payload versioning 與 migration dry-run。
4. 全球市場、美股、基本面、法人、新聞與族群資金流在取得合法 Provider 前維持 unavailable。
