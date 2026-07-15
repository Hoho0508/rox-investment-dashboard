import type {
  MarketAnalysis,
  PriceCandle,
  SimilarMarketPeriod,
} from "@/types/market";

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const average = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentChange(start: number, end: number) {
  return ((end - start) / start) * 100;
}

function sma(values: number[], period: number) {
  return average(values.slice(-period));
}

function rsi(values: number[], period = 14) {
  const changes = values
    .slice(-(period + 1))
    .slice(1)
    .map((value, index) => value - values.slice(-(period + 1))[index]);
  const gains = changes.map((change) => Math.max(change, 0));
  const losses = changes.map((change) => Math.max(-change, 0));
  const averageGain = average(gains);
  const averageLoss = average(losses);
  if (averageLoss === 0) return 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function volatility(values: number[], period = 20) {
  const rows = values.slice(-(period + 1));
  const returns = rows
    .slice(1)
    .map((value, index) => percentChange(rows[index], value));
  const mean = average(returns);
  return (
    Math.sqrt(average(returns.map((value) => (value - mean) ** 2))) *
    Math.sqrt(252)
  );
}

function maxDrawdown(values: number[]) {
  let peak = values[0];
  let worst = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    worst = Math.min(worst, percentChange(peak, value));
  }
  return worst;
}

type FeatureVector = {
  rsi: number;
  return20d: number;
  return60d: number;
  volatility20d: number;
  drawdown60d: number;
  priceToSma20: number;
};

function features(candles: PriceCandle[], endIndex: number): FeatureVector {
  const window = candles.slice(0, endIndex + 1);
  const closes = window.map((item) => item.close);
  const close = closes.at(-1)!;
  return {
    rsi: rsi(closes),
    return20d: percentChange(closes.at(-21)!, close),
    return60d: percentChange(closes.at(-61)!, close),
    volatility20d: volatility(closes),
    drawdown60d: maxDrawdown(closes.slice(-60)),
    priceToSma20: percentChange(sma(closes, 20), close),
  };
}

function featureDistance(left: FeatureVector, right: FeatureVector) {
  const scales: Record<keyof FeatureVector, number> = {
    rsi: 25,
    return20d: 15,
    return60d: 30,
    volatility20d: 30,
    drawdown60d: 20,
    priceToSma20: 10,
  };
  const keys = Object.keys(scales) as Array<keyof FeatureVector>;
  return Math.sqrt(
    average(keys.map((key) => ((left[key] - right[key]) / scales[key]) ** 2)),
  );
}

export function findSimilarMarketPeriods(
  candles: PriceCandle[],
  count = 5,
): SimilarMarketPeriod[] {
  if (candles.length < 130) return [];
  const current = features(candles, candles.length - 1);
  const candidates: Array<SimilarMarketPeriod & { distance: number }> = [];
  for (let index = 60; index <= candles.length - 62; index += 5) {
    const candidate = features(candles, index);
    const distance = featureDistance(current, candidate);
    candidates.push({
      startDate: candles[index].time,
      similarity: round(Math.max(0, 100 - distance * 55), 0),
      rsi: round(candidate.rsi),
      return20d: round(candidate.return20d),
      future5d:
        index + 5 < candles.length
          ? round(percentChange(candles[index].close, candles[index + 5].close))
          : null,
      future20d:
        index + 20 < candles.length
          ? round(
              percentChange(candles[index].close, candles[index + 20].close),
            )
          : null,
      future60d:
        index + 60 < candles.length
          ? round(
              percentChange(candles[index].close, candles[index + 60].close),
            )
          : null,
      distance,
    });
  }
  return candidates
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((item) => ({
      startDate: item.startDate,
      similarity: item.similarity,
      rsi: item.rsi,
      return20d: item.return20d,
      future5d: item.future5d,
      future20d: item.future20d,
      future60d: item.future60d,
    }));
}

export function analyzeMarketHistory(
  symbol: string,
  candles: PriceCandle[],
): MarketAnalysis {
  if (candles.length < 80) throw new Error("至少需要 80 個交易日才能分析。");
  const closes = candles.map((item) => item.close);
  const volumes = candles.map((item) => item.volume);
  const latest = candles.at(-1)!;
  const indicators = {
    close: latest.close,
    sma20: round(sma(closes, 20)),
    sma60: round(sma(closes, 60)),
    rsi14: round(rsi(closes)),
    return20d: round(percentChange(closes.at(-21)!, latest.close)),
    return60d: round(percentChange(closes.at(-61)!, latest.close)),
    volatility20d: round(volatility(closes)),
    maxDrawdown60d: round(maxDrawdown(closes.slice(-60))),
    volumeRatio20d: round(latest.volume / average(volumes.slice(-20))),
  };
  const analogs = findSimilarMarketPeriods(candles);
  const future20d = analogs.flatMap((item) =>
    item.future20d === null ? [] : [item.future20d],
  );
  const analogStats = {
    sampleSize: future20d.length,
    winRate20d: future20d.length
      ? round(
          (future20d.filter((value) => value > 0).length / future20d.length) *
            100,
          0,
        )
      : null,
    medianReturn20d: future20d.length ? round(median(future20d)) : null,
    averageReturn20d: future20d.length ? round(average(future20d)) : null,
  };

  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];
  if (latest.close > indicators.sma20 && indicators.sma20 > indicators.sma60) {
    score += 18;
    reasons.push("收盤價站上 20 日與 60 日均線，趨勢結構偏多。 ");
  } else if (latest.close < indicators.sma60) {
    score -= 16;
    risks.push("價格位於 60 日均線下方，中期趨勢尚未轉強。");
  }
  if (indicators.rsi14 >= 45 && indicators.rsi14 <= 65) {
    score += 9;
    reasons.push("RSI 位於中性偏強區，尚未進入極端過熱。");
  } else if (indicators.rsi14 > 75) {
    score -= 10;
    risks.push("RSI 高於 75，追價風險偏高。");
  }
  if (indicators.return20d > 0 && indicators.return20d < 18) {
    score += 8;
    reasons.push("近 20 日動能為正且未出現極端單邊漲幅。");
  } else if (indicators.return20d >= 18) {
    score -= 8;
    risks.push("近 20 日漲幅過快，需等待整理或風險報酬改善。");
  }
  if (indicators.volumeRatio20d >= 0.8 && indicators.volumeRatio20d <= 2)
    score += 4;
  if (indicators.volatility20d > 45) {
    score -= 8;
    risks.push("年化波動率偏高，部位與停損距離需要更保守。");
  }
  if (
    (analogStats.medianReturn20d ?? 0) > 0 &&
    (analogStats.winRate20d ?? 0) >= 60
  ) {
    score += 9;
    reasons.push(
      `最相似的 ${analogStats.sampleSize} 段歷史情境，後續 20 日勝率偏正。`,
    );
  } else if ((analogStats.winRate20d ?? 100) < 40) {
    score -= 9;
    risks.push("相似歷史情境的後續 20 日結果偏弱。");
  }

  const hardGate =
    indicators.maxDrawdown60d <= -18 && latest.close < indicators.sma60;
  if (hardGate)
    risks.unshift("硬性風險門檻：60 日回撤超過 18%，且尚未站回 60 日均線。");
  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict =
    hardGate || score < 40
      ? "禁止進場"
      : score >= 70
        ? "可分批觀察"
        : "等待確認";
  const confidence = Math.min(
    90,
    Math.round(
      45 + Math.min(candles.length, 320) / 8 + analogStats.sampleSize * 2,
    ),
  );
  return {
    symbol,
    asOf: latest.time,
    verdict,
    score,
    confidence,
    hardGate,
    summary: `${verdict}：綜合趨勢、動能、波動、成交量與 ${analogStats.sampleSize} 段相似歷史情境。`,
    reasons,
    risks,
    indicators,
    analogs,
    analogStats,
    disclaimer:
      "歷史相似不代表未來必然重演；結果未計入交易成本、滑價與個人風險承受度。",
  };
}
