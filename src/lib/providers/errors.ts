export type ProviderErrorCode =
  | "DATA_MODE_MISSING"
  | "DATA_MODE_INVALID"
  | "NOT_CONFIGURED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE"
  | "EMPTY_DATA"
  | "INVALID_MARKET_DATE"
  | "PROVIDER_UNAVAILABLE"
  | "MANUAL_DATA_MISSING";

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function providerHttpError(provider: string, status: number) {
  if (status === 429)
    return new ProviderError(
      "RATE_LIMITED",
      `${provider} 已達請求頻率限制，請稍後再試。`,
    );
  return new ProviderError(
    "HTTP_ERROR",
    `${provider} 暫時無法取得資料（HTTP ${status}）。`,
  );
}

export function normalizeProviderError(
  error: unknown,
  provider: string,
): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof DOMException && error.name === "TimeoutError")
    return new ProviderError("TIMEOUT", `${provider} 請求逾時。`);
  if (error instanceof SyntaxError)
    return new ProviderError(
      "INVALID_RESPONSE",
      `${provider} 回傳無法解析的資料。`,
    );
  return new ProviderError(
    "PROVIDER_UNAVAILABLE",
    `${provider} 暫時無法取得資料。`,
  );
}
