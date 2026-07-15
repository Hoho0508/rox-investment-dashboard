"use client";

import { useEffect, useState } from "react";
import { CandlestickChart } from "@/components/candlestick-chart";
import type { CandleInterval, CandleSeries } from "@/types/market";
import type { TechnicalAnalysis } from "@/types/technical";

const intervalOptions: Array<{ value: CandleInterval; label: string }> = [
  { value: "tick", label: "Tick" },
  { value: "1m", label: "1 分" },
  { value: "5m", label: "5 分" },
  { value: "15m", label: "15 分" },
  { value: "30m", label: "30 分" },
  { value: "60m", label: "60 分" },
  { value: "1d", label: "日 K" },
  { value: "1w", label: "週 K" },
  { value: "1mo", label: "月 K" },
];

const number = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(
        value,
      );

export function TechnicalAnalysisWorkspace({ symbol }: { symbol: string }) {
  const [interval, setIntervalValue] = useState<CandleInterval>("1m");
  const [series, setSeries] = useState<CandleSeries | null>(null);
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(
        `/api/technical/analysis?symbol=${encodeURIComponent(symbol)}&interval=${interval}`,
        { cache: "no-store" },
      )
        .then(async (response) => {
          const payload = await response.json();
          if (cancelled) return;
          setSeries(payload.series ?? null);
          setAnalysis(payload.analysis ?? null);
          setError(payload.error ?? "");
        })
        .catch(() => !cancelled && setError("技術分析載入失敗。"));
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [interval, symbol]);

  function chooseInterval(value: CandleInterval) {
    setIntervalValue(value);
    setSeries(null);
    setAnalysis(null);
    setError("");
  }

  return (
    <div className="technical-workspace">
      <div className="interval-tabs" aria-label="K 線週期">
        {intervalOptions.map((option) => (
          <button
            className={interval === option.value ? "active" : ""}
            key={option.value}
            onClick={() => chooseInterval(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      {series?.dataMode === "mock" && (
        <p className="notice">
          {series.error ?? "目前為模擬分鐘 K，不代表真實盤中行情。"}
        </p>
      )}
      {error && <p className="notice">{error}</p>}
      <section className="trading-layout">
        <article className="card chart-card">
          <div className="chart-header">
            <div>
              <div className="eyebrow">
                {symbol} · {interval}
              </div>
              <h2>
                {intervalOptions.find((item) => item.value === interval)?.label}{" "}
                K 線
              </h2>
            </div>
            {series && (
              <div className="quote-meta">
                <strong>{number(series.candles.at(-1)?.close ?? null)}</strong>
                <span>
                  {series.sourceName} ·{" "}
                  {series.isDelayed ? "延遲或模擬" : "即時"}
                </span>
              </div>
            )}
          </div>
          {series?.candles.length ? (
            <CandlestickChart candles={series.candles} />
          ) : (
            <div className="chart-empty">K 線載入中或資料不足…</div>
          )}
        </article>

        <aside className="card decision-panel">
          <div className="eyebrow">AI Technical Analysis</div>
          <h2>技術面判斷</h2>
          {analysis ? (
            <>
              <div className={`verdict verdict-${analysis.verdict}`}>
                {analysis.verdict}
              </div>
              <div className="decision-score">
                <strong>{analysis.score}</strong>
                <span>信心 {analysis.confidence}%</span>
              </div>
              <p>
                <b>目前位置：{analysis.position}</b>
              </p>
              <p>{analysis.positionReason}</p>
              <h3>支持證據</h3>
              <ul>
                {analysis.supportingEvidence.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
              <h3>反對證據</h3>
              <ul>
                {analysis.opposingEvidence.map((item) => (
                  <li key={item}>✗ {item}</li>
                ))}
              </ul>
              <p className="notice">
                <b>最大風險：</b>
                {analysis.biggestRisk}
              </p>
              <p>
                <b>失效條件：</b>
                {analysis.invalidation}
              </p>
              <p className="source">{analysis.disclaimer}</p>
            </>
          ) : (
            <p className="muted">等待足夠 K 線後產生分析。</p>
          )}
        </aside>
      </section>

      {analysis && (
        <>
          <section className="indicator-board section">
            <h2>趨勢與動能指標</h2>
            <div className="indicator-table">
              {Object.entries(analysis.indicators.ma).map(([period, value]) => (
                <div key={`ma${period}`}>
                  <span>MA{period}</span>
                  <b>{number(value)}</b>
                </div>
              ))}
              {Object.entries(analysis.indicators.ema).map(
                ([period, value]) => (
                  <div key={`ema${period}`}>
                    <span>EMA{period}</span>
                    <b>{number(value)}</b>
                  </div>
                ),
              )}
              <div>
                <span>VWAP</span>
                <b>{number(analysis.indicators.vwap)}</b>
              </div>
              <div>
                <span>RSI 14</span>
                <b>{number(analysis.indicators.rsi14)}</b>
              </div>
              <div>
                <span>MACD</span>
                <b>{number(analysis.indicators.macd.value)}</b>
              </div>
              <div>
                <span>MACD Hist</span>
                <b>{number(analysis.indicators.macd.histogram)}</b>
              </div>
              <div>
                <span>K / D</span>
                <b>
                  {number(analysis.indicators.stochastic.k)} /{" "}
                  {number(analysis.indicators.stochastic.d)}
                </b>
              </div>
              <div>
                <span>ATR 14</span>
                <b>{number(analysis.indicators.atr14)}</b>
              </div>
              <div>
                <span>Momentum 10</span>
                <b>{number(analysis.indicators.momentum10)}</b>
              </div>
              <div>
                <span>OBV</span>
                <b>{number(analysis.indicators.obv)}</b>
              </div>
              <div>
                <span>Volume MA20</span>
                <b>{number(analysis.indicators.volumeMa20)}</b>
              </div>
              <div>
                <span>StdDev 20</span>
                <b>{number(analysis.indicators.standardDeviation20)}</b>
              </div>
            </div>
          </section>

          <section className="grid grid-2 section">
            <article className="card">
              <h2>支撐壓力與研究區間</h2>
              <div className="level-grid">
                <span>
                  支撐 <b>{number(analysis.supportResistance.support)}</b>
                </span>
                <span>
                  壓力 <b>{number(analysis.supportResistance.resistance)}</b>
                </span>
                <span>
                  前高 <b>{number(analysis.supportResistance.previousHigh)}</b>
                </span>
                <span>
                  前低 <b>{number(analysis.supportResistance.previousLow)}</b>
                </span>
              </div>
              {analysis.zones.map((zone) => (
                <div className="technical-zone" key={zone.name}>
                  <strong>{zone.name}</strong>
                  <span>
                    {number(zone.low)}～{number(zone.high)}
                  </span>
                  <small>{zone.reason}</small>
                </div>
              ))}
            </article>
            <article className="card">
              <h2>型態辨識</h2>
              {analysis.patterns.length ? (
                analysis.patterns.map((pattern) => (
                  <div className="pattern-row" key={pattern.name}>
                    <strong>{pattern.name}</strong>
                    <span>
                      {pattern.completed ? "已完成" : "形成中"} · 信心{" "}
                      {pattern.confidence}%
                    </span>
                    <p>{pattern.reason}</p>
                  </div>
                ))
              ) : (
                <p className="muted">目前沒有達到規則門檻的明確型態。</p>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
