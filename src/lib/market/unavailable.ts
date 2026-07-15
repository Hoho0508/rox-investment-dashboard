import type { RealtimeTaiwanMarketProvider } from "@/lib/market/contracts";
import type { LiveQuote, TaiwanSecurity } from "@/types/market";
import type { ProviderErrorCode } from "@/lib/providers/errors";
import { ProviderError } from "@/lib/providers/errors";

export function unavailableQuote(
  symbol: string,
  sourceName: string,
  errorMessage: string,
  errorCode: ProviderErrorCode = "PROVIDER_UNAVAILABLE",
): LiveQuote {
  const fetchedAt = new Date().toISOString();
  return {
    symbol,
    name: symbol,
    exchange: "UNKNOWN",
    market: "TW",
    price: null,
    previousClose: null,
    open: null,
    high: null,
    low: null,
    change: null,
    changePercent: null,
    volume: null,
    asOf: fetchedAt,
    fetchedAt,
    sourceName,
    dataMode: "unavailable",
    isDelayed: true,
    status: "unavailable",
    errorCode,
    errorMessage,
  };
}

export class UnavailableRealtimeTaiwanProvider implements RealtimeTaiwanMarketProvider {
  constructor(
    private readonly errorMessage = "正式台股資料尚未完成設定。",
    private readonly errorCode: ProviderErrorCode = "NOT_CONFIGURED",
  ) {}

  async search(_query: string, _limit = 20): Promise<TaiwanSecurity[]> {
    void _query;
    void _limit;
    throw new ProviderError(this.errorCode, this.errorMessage);
  }

  async getQuotes(symbols: string[]) {
    return symbols.map((symbol) =>
      unavailableQuote(
        symbol,
        "尚無可用正式資料",
        this.errorMessage,
        this.errorCode,
      ),
    );
  }
}
