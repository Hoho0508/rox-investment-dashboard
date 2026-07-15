import {
  averageTrueRange,
  bollingerBands,
  exponentialMovingAverage,
  momentum,
  movingAverageConvergenceDivergence,
  onBalanceVolume,
  relativeStrengthIndex,
  simpleMovingAverage,
  standardDeviation,
  stochasticOscillator,
  volumeWeightedAveragePrice,
} from "@/lib/technical/indicators";
import type { CandleSeries, PriceCandle } from "@/types/market";
import type {
  TechnicalAnalysis,
  TechnicalPosition,
  TechnicalZone,
} from "@/types/technical";
import type { RuntimeDataMode } from "@/lib/config/data-mode";

export function assertTechnicalAnalysisInput(
  series: CandleSeries,
  runtimeMode: RuntimeDataMode,
) {
  if (
    (runtimeMode === "live" || runtimeMode === "unavailable") &&
    series.dataMode === "mock"
  )
    throw new Error("Live/Production 模式拒絕使用 Mock K 線進行技術評分。");
}

const round = (value: number | null, digits = 2) =>
  value === null ? null : Number(value.toFixed(digits));

function identifyPosition(
  candles: PriceCandle[],
  ma20: number | null,
  ma60: number | null,
  rsi: number | null,
): { position: TechnicalPosition; reason: string } {
  const latest = candles.at(-1)!;
  const previous = candles.slice(-21, -1);
  const previousHigh = Math.max(...previous.map((item) => item.high));
  const previousLow = Math.min(...previous.map((item) => item.low));
  const range = (previousHigh - previousLow) / latest.close;
  if (latest.close > previousHigh)
    return { position: "突破", reason: "收盤價已越過前 20 根 K 線高點。" };
  if (latest.close < previousLow && latest.close < (ma60 ?? latest.close))
    return { position: "空頭", reason: "跌破前低且位於 MA60 下方。" };
  if (ma20 && ma60 && latest.close > ma20 && ma20 > ma60 && (rsi ?? 50) < 72)
    return {
      position: "主升段",
      reason: "價格、MA20、MA60 呈多頭排列，動能尚未極端過熱。",
    };
  if ((rsi ?? 0) >= 72 && latest.close > (ma20 ?? latest.close))
    return {
      position: "末升段",
      reason: "趨勢仍強但 RSI 已進入高檔，追價風險上升。",
    };
  if (range < 0.08)
    return { position: "盤整", reason: "近 20 根 K 線高低區間小於現價 8%。" };
  if (ma20 && latest.close < ma20 && ma60 && latest.close > ma60)
    return { position: "回檔", reason: "跌破短期均線但仍守在 MA60 上方。" };
  if (ma20 && latest.close > ma20 && ma60 && ma20 < ma60)
    return {
      position: "反彈",
      reason: "站回 MA20，但中期均線尚未轉為多頭排列。",
    };
  return { position: "整理", reason: "趨勢與動能訊號尚未形成一致方向。" };
}

function detectPatterns(candles: PriceCandle[]) {
  const rows = candles.slice(-40);
  if (rows.length < 20) return [];
  const recent = rows.slice(-20);
  const high = Math.max(...recent.map((item) => item.high));
  const low = Math.min(...recent.map((item) => item.low));
  const latest = recent.at(-1)!;
  const range = (high - low) / latest.close;
  const patterns: TechnicalAnalysis["patterns"] = [];
  if (range < 0.08)
    patterns.push({
      name: "箱型整理",
      completed: false,
      confidence: Math.round(Math.max(45, 90 - range * 500)),
      reason: "近 20 根 K 線維持在相對窄幅區間；需等有效突破才算完成。",
    });
  const firstHalfHigh = Math.max(
    ...recent.slice(0, 10).map((item) => item.high),
  );
  const secondHalfHigh = Math.max(...recent.slice(10).map((item) => item.high));
  const firstHalfLow = Math.min(...recent.slice(0, 10).map((item) => item.low));
  const secondHalfLow = Math.min(...recent.slice(10).map((item) => item.low));
  if (secondHalfHigh < firstHalfHigh && secondHalfLow > firstHalfLow)
    patterns.push({
      name: "三角收斂",
      completed: latest.close > firstHalfHigh || latest.close < firstHalfLow,
      confidence: 68,
      reason: "近期高點下降且低點抬高，價格波動正在收斂。",
    });
  return patterns;
}

export function analyzeTechnicalSeries(
  series: CandleSeries,
): TechnicalAnalysis {
  if (series.candles.length < 30)
    throw new Error("至少需要 30 根 K 線才能分析。 ");
  const candles = series.candles;
  const closes = candles.map((item) => item.close);
  const volumes = candles.map((item) => item.volume);
  const latest = candles.at(-1)!;
  const ma = {
    "5": round(simpleMovingAverage(closes, 5)),
    "10": round(simpleMovingAverage(closes, 10)),
    "20": round(simpleMovingAverage(closes, 20)),
    "60": round(simpleMovingAverage(closes, 60)),
    "120": round(simpleMovingAverage(closes, 120)),
    "240": round(simpleMovingAverage(closes, 240)),
  };
  const ema = {
    "20": round(exponentialMovingAverage(closes, 20)),
    "60": round(exponentialMovingAverage(closes, 60)),
    "120": round(exponentialMovingAverage(closes, 120)),
    "240": round(exponentialMovingAverage(closes, 240)),
  };
  const macdRaw = movingAverageConvergenceDivergence(closes);
  const rsi14 = round(relativeStrengthIndex(closes));
  const stochasticRaw = stochasticOscillator(candles);
  const bollingerRaw = bollingerBands(closes);
  const indicators = {
    ma,
    ema,
    vwap: round(volumeWeightedAveragePrice(candles)),
    macd: {
      value: round(macdRaw.value),
      signal: round(macdRaw.signal),
      histogram: round(macdRaw.histogram),
    },
    rsi14,
    stochastic: { k: round(stochasticRaw.k), d: round(stochasticRaw.d) },
    atr14: round(averageTrueRange(candles)),
    momentum10: round(momentum(closes)),
    obv: round(onBalanceVolume(candles), 0),
    volumeMa20: round(simpleMovingAverage(volumes, 20), 0),
    bollinger: {
      upper: round(bollingerRaw.upper),
      middle: round(bollingerRaw.middle),
      lower: round(bollingerRaw.lower),
    },
    standardDeviation20: round(standardDeviation(closes.slice(-20))),
  };

  const previous = candles.slice(-21, -1);
  const previousHigh = Math.max(...previous.map((item) => item.high));
  const previousLow = Math.min(...previous.map((item) => item.low));
  const support = Math.min(...candles.slice(-20).map((item) => item.low));
  const resistance = Math.max(...candles.slice(-20).map((item) => item.high));
  const positionResult = identifyPosition(candles, ma["20"], ma["60"], rsi14);
  const supportingEvidence: string[] = [];
  const opposingEvidence: string[] = [];
  let score = 50;

  if (ma["20"] && ma["60"] && latest.close > ma["20"] && ma["20"] > ma["60"]) {
    score += 18;
    supportingEvidence.push("價格站上 MA20，且 MA20 高於 MA60。 ");
  } else {
    score -= 12;
    opposingEvidence.push("短中期均線尚未形成多頭排列。 ");
  }
  if (rsi14 !== null && rsi14 >= 45 && rsi14 <= 65) {
    score += 10;
    supportingEvidence.push(`RSI ${rsi14}，位於中性偏強區。`);
  } else if ((rsi14 ?? 0) > 75) {
    score -= 12;
    opposingEvidence.push(`RSI ${rsi14}，動能過熱。`);
  }
  if ((indicators.macd.histogram ?? 0) > 0) {
    score += 10;
    supportingEvidence.push("MACD 柱狀體為正，動能偏多。 ");
  } else {
    score -= 7;
    opposingEvidence.push("MACD 柱狀體未轉正。 ");
  }
  if (indicators.volumeMa20 && latest.volume > indicators.volumeMa20 * 1.2) {
    score += 8;
    supportingEvidence.push("成交量高於 20 期均量 1.2 倍。 ");
  }
  if (latest.close > previousHigh) {
    score += 8;
    supportingEvidence.push("價格突破前 20 期高點。 ");
  }
  if (latest.close < previousLow) {
    score -= 18;
    opposingEvidence.push("價格跌破近期支撐。 ");
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict =
    score >= 72 && positionResult.position !== "末升段"
      ? "適合開始研究"
      : positionResult.position === "突破"
        ? "等待回測"
        : score < 40
          ? "風險增加"
          : "等待突破";
  const zones: TechnicalZone[] = [
    {
      name: "適合開始研究",
      low: round(support)!,
      high: round(support * 1.03)!,
      reason: "接近近期支撐且失效點較清楚。",
    },
    {
      name: "等待回測",
      low: round((ma["20"] ?? latest.close) * 0.98)!,
      high: round((ma["20"] ?? latest.close) * 1.02)!,
      reason: "觀察 MA20 附近是否出現承接。",
    },
    {
      name: "等待突破",
      low: round(resistance * 0.99)!,
      high: round(resistance * 1.02)!,
      reason: "需帶量越過近期壓力並確認站穩。",
    },
    {
      name: "風險增加",
      low: round(support * 0.94)!,
      high: round(support * 0.98)!,
      reason: "跌破支撐後，原技術假設可能失效。",
    },
  ];
  return {
    symbol: series.symbol,
    interval: series.interval,
    asOf: series.asOf,
    dataMode: series.dataMode,
    sourceName: series.sourceName,
    score,
    confidence: Math.min(
      92,
      Math.round(42 + Math.min(candles.length, 240) / 5),
    ),
    verdict,
    position: positionResult.position,
    positionReason: positionResult.reason,
    indicators,
    supportResistance: {
      support: round(support)!,
      resistance: round(resistance)!,
      previousHigh: round(previousHigh)!,
      previousLow: round(previousLow)!,
      movingAverageSupport: ma["20"],
    },
    zones,
    patterns: detectPatterns(candles),
    supportingEvidence,
    opposingEvidence,
    biggestRisk:
      opposingEvidence[0] ??
      "市場事件、資料延遲或成交量結構可能使技術訊號失真。",
    invalidation: `若價格有效跌破 ${round(support)}，目前技術假設需重新評估。`,
    disclaimer:
      "技術分析描述機率與條件，不代表一定上漲或下跌；不得單獨作為交易依據。",
  };
}
