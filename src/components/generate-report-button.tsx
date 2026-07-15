"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_DEFINITIONS, type ReportType } from "@/lib/reports/config";

export function GenerateReportButton({
  reportType,
}: {
  reportType: ReportType;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType }),
    });
    const result = (await response.json().catch(() => null)) as {
      status?: string;
      error?: string;
    } | null;
    setPending(false);
    if (!response.ok) {
      setMessage(result?.error ?? "產生失敗，請稍後再試。");
      return;
    }
    setMessage(
      result?.status === "duplicate"
        ? `今日${REPORT_DEFINITIONS[reportType].label}已存在，沒有重複新增。`
        : `今日${REPORT_DEFINITIONS[reportType].label}已產生並儲存。`,
    );
    router.refresh();
  }

  return (
    <div className="report-action">
      <button type="button" onClick={generate} disabled={pending}>
        {pending ? "產生中…" : REPORT_DEFINITIONS[reportType].actionLabel}
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
