"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CandlestickChart } from "@/components/candlestick-chart";
import type {
  LiveQuote,
  MarketAnalysis,
  PriceCandle,
  TaiwanSecurity,
} from "@/types/market";

type WatchlistSeed = { symbol: string; name: string; exchange: string | null };

function formatNumber(value: number | null, digits = 2) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("zh-TW", { maximumFractionDigits: digits }).format(
        value,
      );
}

function modeLabel(quote: LiveQuote) {
  if (quote.dataMode === "mock") return "模擬資料";
  if (quote.status === "closed") return "已收盤";
  if (quote.isDelayed) return "延遲行情";
  return "即時行情";
}

export function MarketWorkspace({
  initialWatchlist,
}: {
  initialWatchlist: WatchlistSeed[];
}) {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [quotes, setQuotes] = useState<LiveQuote[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(
    initialWatchlist[0]?.symbol ?? "2330",
  );
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TaiwanSecurity[]>([]);
  const [candles, setCandles] = useState<PriceCandle[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [message, setMessage] = useState("");
  const symbols = useMemo(
    () => watchlist.map((item) => item.symbol),
    [watchlist],
  );

  const refreshQuotes = useCallback(async () => {
    if (symbols.length === 0) return;
    try {
      const response = await fetch(
        `/api/market/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("行情更新失敗");
      const payload = (await response.json()) as {
        quotes: LiveQuote[];
        refreshAfterSeconds: number;
      };
      setQuotes(payload.quotes);
      setCountdown(payload.refreshAfterSeconds);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "行情更新失敗");
    }
  }, [symbols]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshQuotes(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshQuotes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          void refreshQuotes();
          return 30;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refreshQuotes]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(
        `/api/market/candles?symbol=${encodeURIComponent(selectedSymbol)}`,
      ).then((response) => response.json()),
      fetch(
        `/api/market/analysis?symbol=${encodeURIComponent(selectedSymbol)}`,
      ).then((response) => response.json()),
    ])
      .then(([candlePayload, analysisPayload]) => {
        if (cancelled) return;
        setCandles(candlePayload.candles ?? []);
        setAnalysis(analysisPayload.error ? null : analysisPayload);
        if (analysisPayload.error) setMessage(analysisPayload.error);
      })
      .catch(() => !cancelled && setMessage("K 線或歷史分析載入失敗。"));
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  async function runSearch() {
    if (!search.trim()) return setResults([]);
    const response = await fetch(
      `/api/market/search?q=${encodeURIComponent(search.trim())}`,
    );
    const payload = (await response.json()) as TaiwanSecurity[];
    setResults(Array.isArray(payload) ? payload : []);
  }

  async function addSecurity(security: TaiwanSecurity) {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(security),
    });
    if (!response.ok) return setMessage("加入自選清單失敗。");
    setWatchlist((items) =>
      items.some((item) => item.symbol === security.symbol)
        ? items
        : [
            ...items,
            {
              symbol: security.symbol,
              name: security.name,
              exchange: security.exchange,
            },
          ],
    );
    setSelectedSymbol(security.symbol);
    setCandles([]);
    setAnalysis(null);
    setResults([]);
    setSearch("");
    setMessage(`${security.name}已加入自選清單。`);
  }

  async function removeSecurity(symbol: string) {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    });
    setWatchlist((items) => items.filter((item) => item.symbol !== symbol));
    if (selectedSymbol === symbol) {
      const next = watchlist.find((item) => item.symbol !== symbol);
      if (next) {
        setSelectedSymbol(next.symbol);
        setCandles([]);
        setAnalysis(null);
      }
    }
  }

  const selectedQuote = quotes.find((quote) => quote.symbol === selectedSymbol);
  return (
    <div className="market-workspace">
      <section className="card market-search-card">
        <div>
          <div className="eyebrow">All TWSE & TPEx</div>
          <h2>搜尋全台上市上櫃股票</h2>
        </div>
        <div className="market-search">
          <input
            aria-label="股票代碼或名稱"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void runSearch()}
            placeholder="輸入 2330、台積電、聯發科…"
            value={search}
          />
          <button onClick={() => void runSearch()} type="button">
            搜尋
          </button>
        </div>
        {results.length > 0 && (
          <div className="search-results">
            {results.map((security) => (
              <button
                className="search-result"
                key={security.symbol}
                onClick={() => void addSecurity(security)}
                type="button"
              >
                <strong>{security.symbol}</strong>
                <span>{security.name}</span>
                <small>{security.exchange}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="live-toolbar">
        <div>
          <strong>自選即時追蹤</strong>
          <span>下一次更新 {countdown} 秒</span>
        </div>
        <button onClick={() => void refreshQuotes()} type="button">
          立即更新
        </button>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="quote-strip">
        {watchlist.map((item) => {
          const quote = quotes.find((row) => row.symbol === item.symbol);
          const change = quote?.changePercent ?? null;
          return (
            <article
              className={
                selectedSymbol === item.symbol
                  ? "quote-card selected"
                  : "quote-card"
              }
              key={item.symbol}
            >
              <button
                className="quote-select"
                onClick={() => {
                  setSelectedSymbol(item.symbol);
                  setCandles([]);
                  setAnalysis(null);
                }}
                type="button"
              >
                <span>
                  <strong>{item.symbol}</strong> {item.name}
                </span>
                <b>{formatNumber(quote?.price ?? null)}</b>
                <em
                  className={
                    change === null ? "" : change >= 0 ? "positive" : "negative"
                  }
                >
                  {change === null
                    ? "讀取中"
                    : `${change >= 0 ? "+" : ""}${formatNumber(change)}%`}
                </em>
                <small>{quote ? modeLabel(quote) : "等待行情"}</small>
              </button>
              <Link className="open-analysis" href={`/stocks/${item.symbol}`}>
                完整技術分析
              </Link>
              <button
                aria-label={`移除 ${item.name}`}
                className="remove-watch"
                onClick={() => void removeSecurity(item.symbol)}
                type="button"
              >
                ×
              </button>
            </article>
          );
        })}
      </div>

      <section className="trading-layout">
        <article className="card chart-card">
          <div className="chart-header">
            <div>
              <div className="eyebrow">{selectedSymbol} · Daily OHLCV</div>
              <h2>{selectedQuote?.name ?? selectedSymbol} K 線</h2>
            </div>
            {selectedQuote && (
              <div className="quote-meta">
                <strong>{formatNumber(selectedQuote.price)}</strong>
                <span>
                  {selectedQuote.sourceName} ·{" "}
                  {new Date(selectedQuote.asOf).toLocaleString("zh-TW")}
                </span>
              </div>
            )}
          </div>
          {candles.length === 0 ? (
            <div className="chart-empty">分析資料載入中…</div>
          ) : (
            <CandlestickChart candles={candles} />
          )}
        </article>

        <aside className="card decision-panel">
          <div className="eyebrow">Evidence-based entry logic</div>
          <h2>進場判斷</h2>
          {analysis ? (
            <>
              <div className={`verdict verdict-${analysis.verdict}`}>
                {analysis.verdict}
              </div>
              <div className="decision-score">
                <strong>{analysis.score}</strong>
                <span>信心 {analysis.confidence}%</span>
              </div>
              <p>{analysis.summary}</p>
              <h3>支持因素</h3>
              <ul>
                {analysis.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <h3>主要風險</h3>
              <ul>
                {analysis.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
              <p className="source">{analysis.disclaimer}</p>
            </>
          ) : (
            <p className="muted">等待足夠歷史資料後產生判斷。</p>
          )}
        </aside>
      </section>

      {analysis && (
        <section className="section">
          <div className="grid grid-4 indicator-grid">
            <div className="card">
              <span>RSI 14</span>
              <strong>{analysis.indicators.rsi14}</strong>
            </div>
            <div className="card">
              <span>20 日報酬</span>
              <strong>{analysis.indicators.return20d}%</strong>
            </div>
            <div className="card">
              <span>60 日最大回撤</span>
              <strong>{analysis.indicators.maxDrawdown60d}%</strong>
            </div>
            <div className="card">
              <span>20 日年化波動</span>
              <strong>{analysis.indicators.volatility20d}%</strong>
            </div>
          </div>
          <article className="card section">
            <div className="topline compact">
              <div>
                <div className="eyebrow">Historical analogs</div>
                <h2>最相似的歷史市場情境</h2>
              </div>
              <div className="analog-summary">
                20 日勝率{" "}
                <strong>{analysis.analogStats.winRate20d ?? "—"}%</strong> ·
                中位報酬{" "}
                <strong>{analysis.analogStats.medianReturn20d ?? "—"}%</strong>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>歷史日期</th>
                    <th>相似度</th>
                    <th>當時 RSI</th>
                    <th>當時 20 日</th>
                    <th>後 5 日</th>
                    <th>後 20 日</th>
                    <th>後 60 日</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.analogs.map((item) => (
                    <tr key={item.startDate}>
                      <td>{item.startDate}</td>
                      <td>{item.similarity}%</td>
                      <td>{item.rsi}</td>
                      <td>{item.return20d}%</td>
                      <td>{item.future5d ?? "—"}%</td>
                      <td>{item.future20d ?? "—"}%</td>
                      <td>{item.future60d ?? "—"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
