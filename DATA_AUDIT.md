# Data Audit

## 資料流追蹤

### 晨報

`page/API/Cron -> reports/store -> reports/generate -> providers/index -> FinMindMarketDataProvider -> FinMind/Fugle/Mock -> scoring -> Prisma MorningReport`

- `getMarketProvider()` 永遠建立 FinMind provider 並注入 Mock fallback。
- `DATA_MODE=live` 時，多數失敗分支會改成 unavailable，這是正確的現有保護。
- `DATA_MODE` 未設定/拼錯時則走 Mock；production 沒有單一 fail-closed gate。
- Live 股票仍以 Mock stock template 為骨架，數值基本面雖被設為 null，但固定風險與事件敘事仍被保留。
- Live 模式沒有全球市場 provider，情境模型會停用；UI 不顯示內部固定機率。

### 即時/延遲報價

`MarketWorkspace -> /api/market/quotes -> getRealtimeTaiwanProvider -> Fugle(key present) OR FinMind delayed -> unavailable/Mock`

- Provider 選擇只看 Fugle key，沒有先尊重明確 mock 模式。
- Fugle 失敗在 live 模式回 unavailable，非 live 回 Mock。
- 無 Fugle 時 FinMind 使用最近收盤價，但 dataMode 是 `live`、`isDelayed=true`；六態模型應改成 `delayed`。
- FinMind delayed quote 有 5 分鐘記憶體 cache，但失敗不使用過期成功值形成 stale。

### 股票搜尋與 K 線

`MarketWorkspace/TechnicalWorkspace -> search/candles/technical APIs -> market/index -> FinMind/Fugle/Mock`

- 搜尋、日 K、分鐘 K 的 fallback 分別散落在 `market/index.ts`、`finmind-market.ts`、`fugle.ts`。
- live 模式失敗大多回空陣列/unavailable；mock 模式允許 Mock。
- 日 K API 與歷史分析 API 會為同一股票重複抓取 K 線。
- 分鐘 K 只有 Fugle；無 key 的 live 模式正確回 unavailable。
- 週 K 聚合以自製週 key 計算，尚無 ISO week/交易所 calendar 的邊界 fixture。

### 技術分析與評分

`CandleSeries -> technical/analyze -> indicators -> TechnicalAnalysis`

- TechnicalAnalysis 保留 series 的 sourceName/dataMode，但沒有阻止 Mock series 產生高 confidence 分數。
- Historical MarketAnalysis 不帶 sourceName/dataMode，因此 UI 無法驗證歷史判斷使用真實或 Mock K 線。
- Report scoring 使用 StockSnapshot；重要基本面缺失仍會給數字分數，沒有 invalid/lineage 狀態。

## 所有 Mock fallback

| 位置                       | 觸發                                       | 現況                                                     |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `providers/finmind.ts`     | 無 token、FinMind/Fugle 失敗               | 非 live 回 Mock；live 回 unavailable。                   |
| `providers/index.ts`       | 無效/缺少 DATA_MODE                        | 直接解析為 mock。                                        |
| `market/finmind-market.ts` | 搜尋、quote、candles 失敗                  | 非 live 回 Mock；live 回空或 unavailable。               |
| `market/fugle.ts`          | 搜尋、quote、candles 失敗                  | 非 live 回 Mock；live 回空或 unavailable。               |
| `market/index.ts`          | 搜尋失敗、日 K 少於 80、分鐘 K 無 key/失敗 | 非 live 回 Mock；live 回空/unavailable。                 |
| `reports/view.ts`          | DB 讀取/解析失敗                           | 生成即時 preview；資料來源依 DATA_MODE，會遮蔽 DB 故障。 |
| `market/watchlist.ts`      | DB 無資料或任意錯誤                        | 回固定預設自選股；未標示 DB 錯誤。                       |
| tests/fixtures             | 技術/歷史/scoring deterministic fixture    | 合理保留，但必須明確是測試資料且不能進 live pipeline。   |

## Live/Mock 混合風險

1. Live stock price 展開 Mock stock template，保留固定 `majorRisk` 與 `nextEvent`。
2. Provider mode 由金鑰存在決定，和 DATA_MODE 可能矛盾。
3. 技術與歷史分析可用 Mock candles 產生看似正式的 score/confidence。
4. 評分對缺失資料用固定中性/基礎分，沒有 invalid 狀態。
5. MarketPulse 對非 unavailable/non-mock 模式預設固定族群與資金流；六態加入後若未重構，delayed/stale 可能誤走 live 敘事。
6. `DataPoint` 與 `LiveQuote` 各自描述模式，新鮮度與 availability，容易在 UI 產生不同標籤。

## 目標資料契約

```ts
type DataMode =
  "live" | "delayed" | "stale" | "manual" | "mock" | "unavailable";

type DataEnvelope<T> = {
  value: T | null;
  dataMode: DataMode;
  sourceName: string;
  sourceUrl?: string;
  marketDate?: string;
  fetchedAt: string;
  lastSuccessfulFetchAt?: string;
  isDelayed: boolean;
  confidence: number;
  errorCode?: string;
  errorMessage?: string;
};
```

Provider 只負責取得及驗證自己的資料，不選 fallback。Factory/service 依已驗證的 runtime mode 選 provider；live 僅允許 live/delayed/stale/unavailable，mock 僅允許 mock，manual 僅允許 manual/unavailable。

## 資料集現況

| 資料集            | 現有 Provider         | 真實性/新鮮度        | 主要缺口                               |
| ----------------- | --------------------- | -------------------- | -------------------------------------- |
| 台股報價          | Fugle / FinMind close | 即時或盤後延遲       | 六態與 stale cache。                   |
| 日 K              | FinMind               | 延遲                 | dataMode 錯標 live、日期語意驗證不足。 |
| 分 K              | Fugle                 | 即時                 | cache/coalescing、錯誤 taxonomy。      |
| 股票清單          | FinMind               | 6 小時 cache         | status/last success 未對 UI 暴露。     |
| 全球市場          | Mock only             | 正式模式 unavailable | 尚無合法 live provider。               |
| 基本面/EPS/月營收 | Mock template only    | 正式模式 null        | 必須完全拆離 live snapshot。           |
| 法人/新聞/資金流  | 無                    | unavailable          | 不可用固定敘事補值。                   |
| 技術分析          | 本地純函式            | 取決於 K 線          | provenance gate、數學 fixture。        |
| 晨報              | 聚合結果              | 混合完整度           | 需 dataset-level lineage 與 version。  |

Phase 1 未修改任何資料流。
