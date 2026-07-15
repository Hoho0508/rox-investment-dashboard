import type { PriceCandle } from "@/types/market";

const average = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

export function standardDeviation(values: number[]) {
  if (values.length === 0) return null;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

export function simpleMovingAverage(values: number[], period: number) {
  return values.length < period ? null : average(values.slice(-period));
}

export function exponentialMovingAverageSeries(
  values: number[],
  period: number,
) {
  if (values.length < period) return [];
  const multiplier = 2 / (period + 1);
  const series = [average(values.slice(0, period))];
  for (const value of values.slice(period))
    series.push((value - series.at(-1)!) * multiplier + series.at(-1)!);
  return series;
}

export function exponentialMovingAverage(values: number[], period: number) {
  return exponentialMovingAverageSeries(values, period).at(-1) ?? null;
}

export function relativeStrengthIndex(values: number[], period = 14) {
  if (values.length <= period) return null;
  const changes = values
    .slice(-(period + 1))
    .slice(1)
    .map((value, index) => value - values.slice(-(period + 1))[index]);
  const gain = average(changes.map((change) => Math.max(change, 0)));
  const loss = average(changes.map((change) => Math.max(-change, 0)));
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

export function movingAverageConvergenceDivergence(values: number[]) {
  const fast = exponentialMovingAverageSeries(values, 12);
  const slow = exponentialMovingAverageSeries(values, 26);
  if (slow.length < 9) return { value: null, signal: null, histogram: null };
  const offset = fast.length - slow.length;
  const macdSeries = slow.map((value, index) => fast[index + offset] - value);
  const signalSeries = exponentialMovingAverageSeries(macdSeries, 9);
  const value = macdSeries.at(-1)!;
  const signal = signalSeries.at(-1) ?? null;
  return { value, signal, histogram: signal === null ? null : value - signal };
}

export function averageTrueRange(candles: PriceCandle[], period = 14) {
  if (candles.length <= period) return null;
  const rows = candles.slice(-(period + 1));
  const ranges = rows
    .slice(1)
    .map((item, index) =>
      Math.max(
        item.high - item.low,
        Math.abs(item.high - rows[index].close),
        Math.abs(item.low - rows[index].close),
      ),
    );
  return average(ranges);
}

export function stochasticOscillator(candles: PriceCandle[], period = 14) {
  if (candles.length < period + 2) return { k: null, d: null };
  const kValues = candles.slice(-3).map((_, offset) => {
    const end = candles.length - 3 + offset;
    const window = candles.slice(end - period + 1, end + 1);
    const high = Math.max(...window.map((item) => item.high));
    const low = Math.min(...window.map((item) => item.low));
    return high === low
      ? 50
      : ((candles[end].close - low) / (high - low)) * 100;
  });
  return { k: kValues.at(-1)!, d: average(kValues) };
}

export function volumeWeightedAveragePrice(candles: PriceCandle[]) {
  const volume = candles.reduce((total, item) => total + item.volume, 0);
  if (volume === 0) return null;
  return (
    candles.reduce(
      (total, item) =>
        total + ((item.high + item.low + item.close) / 3) * item.volume,
      0,
    ) / volume
  );
}

export function onBalanceVolume(candles: PriceCandle[]) {
  if (candles.length === 0) return null;
  return candles.slice(1).reduce((total, item, index) => {
    const previous = candles[index].close;
    return (
      total +
      (item.close > previous
        ? item.volume
        : item.close < previous
          ? -item.volume
          : 0)
    );
  }, 0);
}

export function bollingerBands(values: number[], period = 20, multiplier = 2) {
  const rows = values.slice(-period);
  if (rows.length < period) return { upper: null, middle: null, lower: null };
  const middle = average(rows);
  const deviation = standardDeviation(rows)!;
  return {
    upper: middle + deviation * multiplier,
    middle,
    lower: middle - deviation * multiplier,
  };
}

export function momentum(values: number[], period = 10) {
  if (values.length <= period) return null;
  return values.at(-1)! - values.at(-(period + 1))!;
}
