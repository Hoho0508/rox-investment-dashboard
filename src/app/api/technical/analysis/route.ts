import { requireOwnerSession } from "@/lib/auth/request";
import { resolveRuntimeDataMode } from "@/lib/config/data-mode";
import { getTaiwanCandleSeries } from "@/lib/market";
import {
  analyzeTechnicalSeries,
  assertTechnicalAnalysisInput,
} from "@/lib/technical/analyze";
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
  try {
    assertTechnicalAnalysisInput(series, resolveRuntimeDataMode().mode);
  } catch (error) {
    return Response.json(
      {
        series,
        analysis: null,
        errorCode: "MOCK_INPUT_REJECTED",
        errorMessage:
          error instanceof Error ? error.message : "技術分析輸入不合法。",
      },
      { status: 422 },
    );
  }
  if (series.candles.length < 30)
    return Response.json(
      {
        series,
        analysis: null,
        errorCode: series.errorCode ?? "INSUFFICIENT_DATA",
        errorMessage: series.errorMessage ?? "K 線數量不足。",
      },
      { status: 422 },
    );
  return Response.json(
    { series, analysis: analyzeTechnicalSeries(series) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
