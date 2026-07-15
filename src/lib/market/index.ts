import {
  fetchFinMindCandles,
  searchFinMindSecurities,
} from "@/lib/market/finmind-market";
import { FugleRealtimeTaiwanProvider } from "@/lib/market/fugle";
import { MockRealtimeTaiwanProvider } from "@/lib/market/mock";

const mock = new MockRealtimeTaiwanProvider();

export function getRealtimeTaiwanProvider() {
  const key = process.env.FUGLE_MARKETDATA_API_KEY;
  return key ? new FugleRealtimeTaiwanProvider(key) : mock;
}

export async function searchTaiwanSecurities(query: string, limit = 20) {
  try {
    return await searchFinMindSecurities(query, limit);
  } catch {
    return mock.search(query, limit);
  }
}

export async function getTaiwanCandles(symbol: string, limit = 320) {
  try {
    const rows = await fetchFinMindCandles(symbol, limit);
    return rows.length >= 80 ? rows : mock.getCandles(symbol, limit);
  } catch {
    return mock.getCandles(symbol, limit);
  }
}
