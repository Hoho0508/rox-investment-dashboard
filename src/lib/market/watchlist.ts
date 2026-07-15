import { prisma } from "@/lib/db/client";

export const DEFAULT_WATCHLIST = [
  { symbol: "2330", name: "台積電", market: "TW", exchange: "TWSE" },
  { symbol: "2317", name: "鴻海", market: "TW", exchange: "TWSE" },
  { symbol: "2454", name: "聯發科", market: "TW", exchange: "TWSE" },
] as const;

export async function getWatchlist() {
  try {
    const rows = await prisma.watchlistItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.length > 0 ? rows : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}
