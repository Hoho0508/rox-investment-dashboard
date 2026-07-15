import type { DataEnvelope, DataMode } from "@/types/domain";
import type { ProviderError } from "@/lib/providers/errors";

export function unavailableEnvelope<T>(
  sourceName: string,
  error: Pick<ProviderError, "code" | "message">,
): DataEnvelope<T> {
  return {
    value: null,
    dataMode: "unavailable",
    sourceName,
    fetchedAt: new Date().toISOString(),
    isDelayed: true,
    confidence: 0,
    errorCode: error.code,
    errorMessage: error.message,
  };
}

export function staleEnvelope<T>(
  cached: DataEnvelope<T>,
  error: Pick<ProviderError, "code" | "message">,
): DataEnvelope<T> {
  const lastSuccessfulFetchAt =
    cached.lastSuccessfulFetchAt ?? cached.fetchedAt;
  return {
    ...cached,
    dataMode: "stale",
    fetchedAt: new Date().toISOString(),
    lastSuccessfulFetchAt,
    isDelayed: true,
    confidence: Math.min(cached.confidence, 55),
    errorCode: error.code,
    errorMessage: error.message,
  };
}

export function deriveAggregateDataMode(
  envelopes: Array<DataEnvelope<unknown>>,
): DataMode {
  if (envelopes.length === 0) return "unavailable";
  if (envelopes.some((item) => item.dataMode === "mock")) return "mock";
  const available = envelopes.filter(
    (item) => item.value !== null && item.dataMode !== "unavailable",
  );
  if (available.length === 0) return "unavailable";
  if (available.some((item) => item.dataMode === "stale")) return "stale";
  if (available.some((item) => item.dataMode === "manual")) return "manual";
  if (available.some((item) => item.dataMode === "delayed")) return "delayed";
  return "live";
}
