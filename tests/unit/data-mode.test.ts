import { describe, expect, it } from "vitest";
import {
  DATA_MODES,
  dataModeSchema,
  resolveRuntimeDataMode,
} from "@/lib/config/data-mode";
import { dataModeSchema as validationDataModeSchema } from "@/lib/validation/schemas";
import { DATA_MODES as DOMAIN_DATA_MODES } from "@/types/domain";
import { createReportMarketProvider } from "@/lib/providers/provider-factory";
import { deriveAggregateDataMode } from "@/lib/providers/envelopes";
import type { DataEnvelope } from "@/types/domain";

const point = (
  value: number | null,
  dataMode: DataEnvelope<number>["dataMode"],
): DataEnvelope<number> => ({
  value,
  dataMode,
  sourceName: "test",
  fetchedAt: "2026-07-15T00:00:00.000Z",
  isDelayed: dataMode !== "live",
  confidence: value === null ? 0 : 90,
});

describe("統一資料模式", () => {
  it("development 未設定 DATA_MODE 時預設 mock", () => {
    expect(resolveRuntimeDataMode({ NODE_ENV: "development" }).mode).toBe(
      "mock",
    );
  });

  it("production 未設定 DATA_MODE 時 fail closed", () => {
    const result = resolveRuntimeDataMode({ NODE_ENV: "production" });
    expect(result.mode).toBe("unavailable");
    expect(result.errorCode).toBe("DATA_MODE_MISSING");
    expect(createReportMarketProvider(result).mode).toBe("unavailable");
  });

  it("無效 DATA_MODE 不會退回 mock", () => {
    const result = resolveRuntimeDataMode({
      DATA_MODE: "liv",
      NODE_ENV: "production",
    });
    expect(result.mode).toBe("unavailable");
    expect(result.errorCode).toBe("DATA_MODE_INVALID");
  });

  it("Zod schema 與 TypeScript DataMode 常數完全一致", () => {
    expect(dataModeSchema.options).toEqual([...DATA_MODES]);
    expect(DOMAIN_DATA_MODES).toBe(DATA_MODES);
    expect(validationDataModeSchema).toBe(dataModeSchema);
    for (const mode of DATA_MODES)
      expect(dataModeSchema.parse(mode)).toBe(mode);
  });

  it("部分欄位 unavailable 時保留成功資料的 aggregate mode", () => {
    expect(
      deriveAggregateDataMode([
        point(44_737.95, "delayed"),
        point(null, "unavailable"),
      ]),
    ).toBe("delayed");
    expect(deriveAggregateDataMode([point(null, "unavailable")])).toBe(
      "unavailable",
    );
  });
});
