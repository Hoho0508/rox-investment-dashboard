import { requireOwnerSession } from "@/lib/auth/request";
import { prisma } from "@/lib/db/client";
import { resolveLibraryStocks } from "@/lib/research/stock-library";
import { watchlistLibrarySchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const parsed = watchlistLibrarySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "請選擇 1～40 檔股票。" }, { status: 400 });

  const stocks = resolveLibraryStocks(parsed.data.symbols);
  if (stocks.length !== new Set(parsed.data.symbols).size)
    return Response.json(
      { error: "選擇內容包含不在股票倉庫中的代碼。" },
      { status: 400 },
    );

  try {
    const items = await prisma.$transaction(
      stocks.map((stock, index) =>
        prisma.watchlistItem.upsert({
          where: { symbol: stock.symbol },
          create: { ...stock, market: "TW", sortOrder: 100 + index },
          update: { name: stock.name, exchange: stock.exchange },
        }),
      ),
    );
    return Response.json({ saved: items.length, items }, { status: 201 });
  } catch {
    return Response.json(
      { error: "目前無法儲存自選股，請稍後再試。" },
      { status: 503 },
    );
  }
}
