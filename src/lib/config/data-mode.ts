import { z } from "zod";

export const DATA_MODES = [
  "live",
  "delayed",
  "stale",
  "manual",
  "mock",
  "unavailable",
] as const;

export const dataModeSchema = z.enum(DATA_MODES);
export type DataMode = z.infer<typeof dataModeSchema>;

const REQUESTED_DATA_MODES = [
  "live",
  "manual",
  "mock",
] as const satisfies readonly DataMode[];

export const requestedDataModeSchema = z.enum(REQUESTED_DATA_MODES);

export type RequestedDataMode = z.infer<typeof requestedDataModeSchema>;
export type RuntimeDataMode = RequestedDataMode | "unavailable";

type RuntimeEnvironment = {
  DATA_MODE?: string;
  NODE_ENV?: string;
};

export type DataModeResolution = {
  mode: RuntimeDataMode;
  requestedMode?: string;
  errorCode?: "DATA_MODE_MISSING" | "DATA_MODE_INVALID";
  warning?: string;
};

export function isProductionRuntime(
  environment: RuntimeEnvironment = process.env,
) {
  return environment.NODE_ENV === "production";
}

export function resolveRuntimeDataMode(
  environment: RuntimeEnvironment = process.env,
): DataModeResolution {
  const requested = environment.DATA_MODE?.trim().toLowerCase();
  if (requested) {
    const parsed = requestedDataModeSchema.safeParse(requested);
    if (parsed.success)
      return { mode: parsed.data, requestedMode: parsed.data };
    return {
      mode: "unavailable",
      requestedMode: requested,
      errorCode: "DATA_MODE_INVALID",
      warning: "DATA_MODE 設定無效，為避免誤用模擬資料已停用行情。",
    };
  }
  if (isProductionRuntime(environment))
    return {
      mode: "unavailable",
      errorCode: "DATA_MODE_MISSING",
      warning: "Production 未設定 DATA_MODE，為避免誤用模擬資料已停用行情。",
    };
  return {
    mode: "mock",
    warning: "本機未設定 DATA_MODE，預設使用明確標示的 Mock Data。",
  };
}

export function isStrictDataMode(mode: RuntimeDataMode) {
  return mode === "live" || mode === "unavailable";
}
