import { requireOwnerSession } from "@/lib/auth/request";
import { getTaiwanCandleSeries } from "@/lib/market";
import { analyzeTechnicalSeries } from "@/lib/technical/analyze";
import { taiwanSymbolSchema } from "@/lib/validation/schemas";
import { candleIntervals } from "@/types/market";
import { z } from "zod";

export async function GET(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const symbol = taiwanSymbolSchema.safeParse(url.searchParams.get("symbol"));
  const interval = z
    .enum(candleIntervals)
    .safeParse(url.searchParams.get("interval") ?? "1d");
  if (!symbol.success || !interval.success)
    return Response.json(
      { error: "股票代碼或 K 線週期格式不正確。" },
      { status: 400 },
    );
  const series = await getTaiwanCandleSeries(symbol.data, interval.data);
  if (series.candles.length < 30)
    return Response.json(
      { series, analysis: null, error: series.error ?? "K 線數量不足。" },
      { status: 422 },
    );
  return Response.json(
    { series, analysis: analyzeTechnicalSeries(series) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
