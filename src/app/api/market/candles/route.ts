import { requireOwnerSession } from "@/lib/auth/request";
import { getTaiwanCandleSeries } from "@/lib/market";
import { taiwanSymbolSchema } from "@/lib/validation/schemas";
import { candleIntervals } from "@/types/market";
import { z } from "zod";

export async function GET(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const parsed = taiwanSymbolSchema.safeParse(url.searchParams.get("symbol"));
  const interval = z
    .enum(candleIntervals)
    .safeParse(url.searchParams.get("interval") ?? "1d");
  if (!parsed.success)
    return Response.json({ error: "股票代碼格式不正確。" }, { status: 400 });
  if (!interval.success)
    return Response.json({ error: "K 線週期格式不正確。" }, { status: 400 });
  return Response.json(
    await getTaiwanCandleSeries(parsed.data, interval.data),
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
