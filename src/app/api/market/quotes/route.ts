import { requireOwnerSession } from "@/lib/auth/request";
import { getRealtimeTaiwanProvider } from "@/lib/market";
import { taiwanSymbolSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const raw =
    new URL(request.url).searchParams.get("symbols")?.split(",") ?? [];
  const symbols = raw
    .map((symbol) => taiwanSymbolSchema.safeParse(symbol))
    .flatMap((result) => (result.success ? [result.data] : []))
    .slice(0, 20);
  if (symbols.length === 0)
    return Response.json(
      { error: "至少需要一個有效股票代碼。" },
      { status: 400 },
    );
  const quotes = await getRealtimeTaiwanProvider().getQuotes(symbols);
  return Response.json(
    {
      quotes,
      refreshAfterSeconds: quotes.some((item) => item.dataMode === "live")
        ? 15
        : 30,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
