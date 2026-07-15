import type { DataMode } from "@/types/domain";

export const DATA_MODE_LABELS: Record<DataMode, string> = {
  live: "LIVE",
  delayed: "DELAYED",
  stale: "STALE",
  manual: "MANUAL",
  mock: "MOCK",
  unavailable: "UNAVAILABLE",
};

type Props = {
  dataMode: DataMode;
  sourceName: string;
  marketDate?: string;
  fetchedAt: string;
  lastSuccessfulFetchAt?: string;
  isDelayed: boolean;
  errorCode?: string;
  errorMessage?: string;
};

const time = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
};

export function DataProvenance(props: Props) {
  return (
    <div className="source">
      <div>
        {DATA_MODE_LABELS[props.dataMode]} · {props.sourceName} ·{" "}
        {props.isDelayed ? "延遲" : "非延遲"}
      </div>
      <div>
        市場日期 {props.marketDate ?? "—"} · 抓取 {time(props.fetchedAt)}
      </div>
      {props.lastSuccessfulFetchAt && (
        <div>上次成功 {time(props.lastSuccessfulFetchAt)}</div>
      )}
      {(props.errorCode || props.errorMessage) && (
        <div role="status">
          {props.errorCode ?? "DATA_ERROR"}：
          {props.errorMessage ?? "資料暫時無法更新。"}
        </div>
      )}
    </div>
  );
}
