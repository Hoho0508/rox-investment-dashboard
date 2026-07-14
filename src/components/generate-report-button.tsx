"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateReportButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/reports/generate", { method: "POST" });
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
        ? "今日晨報已存在，沒有重複新增。"
        : "今日晨報已產生並儲存。",
    );
    router.refresh();
  }

  return (
    <div className="report-action">
      <button type="button" onClick={generate} disabled={pending}>
        {pending ? "產生中…" : "立即產生晨報"}
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
