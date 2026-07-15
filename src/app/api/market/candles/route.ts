import { requireOwnerSession } from "@/lib/auth/request";
import { getTaiwanCandles } from "@/lib/market";
import { taiwanSymbolSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const parsed = taiwanSymbolSchema.safeParse(
    new URL(request.url).searchParams.get("symbol"),
  );
  if (!parsed.success)
    return Response.json({ error: "股票代碼格式不正確。" }, { status: 400 });
  const candles = await getTaiwanCandles(parsed.data, 320);
  return Response.json(
    { symbol: parsed.data, candles },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
