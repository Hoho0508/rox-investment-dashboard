import { requireOwnerSession } from "@/lib/auth/request";
import { prisma } from "@/lib/db/client";
import { getWatchlist } from "@/lib/market/watchlist";
import { watchlistItemSchema } from "@/lib/validation/schemas";

export async function GET() {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  return Response.json(await getWatchlist());
}

export async function POST(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const parsed = watchlistItemSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "股票資料格式不正確。" }, { status: 400 });
  const item = await prisma.watchlistItem.upsert({
    where: { symbol: parsed.data.symbol },
    create: { ...parsed.data, market: "TW" },
    update: { name: parsed.data.name, exchange: parsed.data.exchange },
  });
  return Response.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase();
  if (!symbol)
    return Response.json({ error: "缺少股票代碼。" }, { status: 400 });
  await prisma.watchlistItem.deleteMany({ where: { symbol } });
  return Response.json({ deleted: true });
}
