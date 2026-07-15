import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import type {
  CandleInterval,
  LiveQuote,
  PriceCandle,
  TaiwanSecurity,
} from "@/types/market";

const securities: TaiwanSecurity[] = [
  { symbol: "0050", name: "元大台灣50", exchange: "TWSE", market: "TW" },
  { symbol: "0056", name: "元大高股息", exchange: "TWSE", market: "TW" },
  { symbol: "1101", name: "台泥", exchange: "TWSE", market: "TW" },
  { symbol: "1216", name: "統一", exchange: "TWSE", market: "TW" },
  { symbol: "1301", name: "台塑", exchange: "TWSE", market: "TW" },
  { symbol: "2002", name: "中鋼", exchange: "TWSE", market: "TW" },
  { symbol: "2303", name: "聯電", exchange: "TWSE", market: "TW" },
  { symbol: "2308", name: "台達電", exchange: "TWSE", market: "TW" },
  { symbol: "2317", name: "鴻海", exchange: "TWSE", market: "TW" },
  { symbol: "2330", name: "台積電", exchange: "TWSE", market: "TW" },
  { symbol: "2344", name: "華邦電", exchange: "TWSE", market: "TW" },
  { symbol: "2357", name: "華碩", exchange: "TWSE", market: "TW" },
  { symbol: "2382", name: "廣達", exchange: "TWSE", market: "TW" },
  { symbol: "2454", name: "聯發科", exchange: "TWSE", market: "TW" },
  { symbol: "2603", name: "長榮", exchange: "TWSE", market: "TW" },
  { symbol: "2881", name: "富邦金", exchange: "TWSE", market: "TW" },
  { symbol: "2882", name: "國泰金", exchange: "TWSE", market: "TW" },
  { symbol: "3008", name: "大立光", exchange: "TWSE", market: "TW" },
  { symbol: "3711", name: "日月光投控", exchange: "TWSE", market: "TW" },
  { symbol: "5274", name: "信驊", exchange: "TPEx", market: "TW" },
  { symbol: "5347", name: "世界", exchange: "TPEx", market: "TW" },
  { symbol: "5483", name: "中美晶", exchange: "TPEx", market: "TW" },
  { symbol: "6488", name: "環球晶", exchange: "TPEx", market: "TW" },
  { symbol: "8299", name: "群聯", exchange: "TPEx", market: "TW" },
];

const knownPrices: Record<string, number> = {
  "0050": 190,
  "0056": 36,
  "2303": 48,
  "2308": 430,
  "2317": 205,
  "2330": 1120,
  "2382": 270,
  "2454": 1450,
  "2603": 220,
  "5274": 4200,
};

function hashSymbol(symbol: string) {
  return [...symbol].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

function roundPrice(value: number) {
  return value >= 1000
    ? Math.round(value / 5) * 5
    : value >= 100
      ? Math.round(value * 2) / 2
      : Math.round(value * 100) / 100;
}

function securityFor(symbol: string): TaiwanSecurity {
  return (
    securities.find((item) => item.symbol === symbol) ?? {
      symbol,
      name: `台股 ${symbol}`,
      exchange: "UNKNOWN",
      market: "TW",
    }
  );
}

export function mockCandles(symbol: string, limit = 320): PriceCandle[] {
  const seed = hashSymbol(symbol);
  const base = knownPrices[symbol] ?? 30 + (seed % 170);
  const rows: PriceCandle[] = [];
  let close = base * 0.76;
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  for (let index = limit * 1.5; rows.length < limit && index >= 0; index -= 1) {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() - index);
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
    const sequence = rows.length;
    const drift = 0.001 + Math.sin((sequence + seed) / 23) * 0.003;
    const shock = Math.sin((sequence + seed) * 1.77) * 0.012;
    const open = close * (1 + Math.sin(sequence * 0.71 + seed) * 0.006);
    close = close * (1 + drift + shock);
    const high = Math.max(open, close) * (1 + 0.006 + Math.abs(shock) * 0.3);
    const low = Math.min(open, close) * (1 - 0.006 - Math.abs(shock) * 0.3);
    rows.push({
      time: day.toISOString().slice(0, 10),
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume: Math.round(
        5_000_000 + Math.abs(Math.sin(sequence + seed)) * 30_000_000,
      ),
    });
  }
  return rows;
}

export function mockIntradayCandles(
  symbol: string,
  interval: CandleInterval,
): PriceCandle[] {
  const minutes = interval === "1m" ? 1 : Number.parseInt(interval, 10) || 1;
  const seed = hashSymbol(symbol);
  const base = knownPrices[symbol] ?? 30 + (seed % 170);
  const rows: PriceCandle[] = [];
  let close = base;
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const totalMinutes = 270;
  for (let minute = 0; minute < totalMinutes; minute += minutes) {
    const sequence = minute / minutes;
    const open = close;
    const move =
      Math.sin((sequence + seed) * 1.41) * 0.0025 +
      Math.sin(sequence / 11) * 0.001;
    close = close * (1 + move);
    const high = Math.max(open, close) * 1.0015;
    const low = Math.min(open, close) * 0.9985;
    const time = new Date(start);
    time.setMinutes(start.getMinutes() + minute);
    rows.push({
      time: time.toISOString(),
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume: Math.round(100 + Math.abs(Math.sin(sequence + seed)) * 4_000),
    });
  }
  return rows;
}

export class MockRealtimeTaiwanProvider implements RealtimeTaiwanMarketProvider {
  async search(query: string, limit = 20) {
    const normalized = query.trim().toLowerCase();
    const matches = securities.filter(
      (item) =>
        !normalized ||
        item.symbol.includes(normalized) ||
        item.name.toLowerCase().includes(normalized),
    );
    if (/^[0-9a-z]{2,8}$/i.test(normalized) && matches.length === 0)
      matches.unshift(securityFor(normalized.toUpperCase()));
    return matches.slice(0, limit);
  }

  async getQuotes(symbols: string[]): Promise<LiveQuote[]> {
    return symbols.map((symbol) => {
      const security = securityFor(symbol);
      const candles = mockCandles(symbol, 65);
      const latest = candles.at(-1)!;
      const previous = candles.at(-2)!;
      const change = latest.close - previous.close;
      return {
        ...security,
        price: latest.close,
        previousClose: previous.close,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        change,
        changePercent: (change / previous.close) * 100,
        volume: latest.volume,
        asOf: new Date().toISOString(),
        sourceName: "Rox 模擬盤中行情",
        dataMode: "mock",
        isDelayed: true,
        status: "mock",
        error: "尚未設定即時行情 API 金鑰。",
      };
    });
  }

  async getCandles(symbol: string, limit = 320) {
    return mockCandles(symbol, limit);
  }
}
