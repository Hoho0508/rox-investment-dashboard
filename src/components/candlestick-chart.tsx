"use client";

import { useMemo, useState } from "react";
import type { PriceCandle } from "@/types/market";

const ranges = [60, 120, 240] as const;

export function CandlestickChart({ candles }: { candles: PriceCandle[] }) {
  const [range, setRange] = useState<(typeof ranges)[number]>(120);
  const rows = useMemo(() => candles.slice(-range), [candles, range]);
  if (rows.length === 0)
    return <div className="chart-empty">暫無 K 線資料</div>;

  const width = 960;
  const height = 420;
  const priceBottom = 320;
  const volumeTop = 340;
  const padding = 24;
  const minimum = Math.min(...rows.map((item) => item.low));
  const maximum = Math.max(...rows.map((item) => item.high));
  const priceRange = Math.max(maximum - minimum, 1);
  const maxVolume = Math.max(...rows.map((item) => item.volume), 1);
  const step = (width - padding * 2) / rows.length;
  const candleWidth = Math.max(2, step * 0.62);
  const y = (price: number) =>
    padding + ((maximum - price) / priceRange) * (priceBottom - padding);

  return (
    <div>
      <div className="chart-toolbar" aria-label="K 線範圍">
        {ranges.map((value) => (
          <button
            className={range === value ? "chart-range active" : "chart-range"}
            key={value}
            onClick={() => setRange(value)}
            type="button"
          >
            {value} 日
          </button>
        ))}
      </div>
      <div className="chart-shell">
        <svg
          aria-label={`最近 ${rows.length} 個交易日 K 線圖`}
          className="candlestick-chart"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = padding + ratio * (priceBottom - padding);
            const price = maximum - ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  className="chart-grid"
                  x1={padding}
                  x2={width - padding}
                  y1={gridY}
                  y2={gridY}
                />
                <text
                  className="chart-axis"
                  x={width - padding - 4}
                  y={gridY - 5}
                >
                  {price.toFixed(1)}
                </text>
              </g>
            );
          })}
          {rows.map((item, index) => {
            const center = padding + step * index + step / 2;
            const up = item.close >= item.open;
            const top = y(Math.max(item.open, item.close));
            const bodyHeight = Math.max(
              1.5,
              Math.abs(y(item.open) - y(item.close)),
            );
            const volumeHeight = (item.volume / maxVolume) * 60;
            return (
              <g className={up ? "candle-up" : "candle-down"} key={item.time}>
                <title>{`${item.time} 開 ${item.open} 高 ${item.high} 低 ${item.low} 收 ${item.close}`}</title>
                <line
                  x1={center}
                  x2={center}
                  y1={y(item.high)}
                  y2={y(item.low)}
                />
                <rect
                  height={bodyHeight}
                  width={candleWidth}
                  x={center - candleWidth / 2}
                  y={top}
                />
                <rect
                  className="volume-bar"
                  height={volumeHeight}
                  width={candleWidth}
                  x={center - candleWidth / 2}
                  y={volumeTop + 60 - volumeHeight}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
