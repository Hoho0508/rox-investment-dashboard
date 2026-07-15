import { prisma } from "@/lib/db/client";
import type { MarketDataProvider } from "@/lib/providers/contracts";
import { CORE_STOCKS } from "@/lib/providers/core-stocks";
import { unavailableEnvelope } from "@/lib/providers/envelopes";
import { ProviderError } from "@/lib/providers/errors";
import type { StockSnapshot } from "@/types/domain";

export class ManualMarketDataProvider implements MarketDataProvider {
  readonly mode = "manual" as const;

  async getGlobalMarkets() {
    return [];
  }

  async getCoreStocks(): Promise<StockSnapshot[]> {
    return Promise.all(
      CORE_STOCKS.map(async (identity): Promise<StockSnapshot> => {
        const row = await prisma.manualDataPoint.findFirst({
          where: { symbol: identity.symbol, field: "price" },
          orderBy: [{ marketDate: "desc" }, { createdAt: "desc" }],
        });
        const fetchedAt = new Date().toISOString();
        return {
          ...identity,
          price: row
            ? {
                value: row.value,
                dataMode: "manual",
                sourceName: row.sourceName,
                marketDate: row.marketDate,
                fetchedAt,
                lastSuccessfulFetchAt: fetchedAt,
                isDelayed: true,
                confidence: 60,
              }
            : unavailableEnvelope<number>(
                "Manual data",
                new ProviderError(
                  "MANUAL_DATA_MISSING",
                  `${identity.symbol} 尚未輸入手動價格。`,
                ),
              ),
          dayChangePercent: null,
          revenueGrowth: null,
          epsGrowth: null,
          grossMarginTrend: null,
          freeCashFlowTrend: null,
          forwardPe: null,
          outlook: "未知",
          thesisIntact: null,
          majorRisk: "手動資料未包含完整基本面與風險欄位。",
          nextEvent: "手動事件資料尚未提供。",
        };
      }),
    );
  }
}
