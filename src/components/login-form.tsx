"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: form.get("password") }),
    });
    setPending(false);
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(result?.error ?? "登入失敗，請稍後再試。");
      return;
    }
    const nextPath = searchParams.get("next");
    router.replace(
      nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/",
    );
    router.refresh();
  }

  return (
    <form className="card login-card" onSubmit={submit}>
      <div className="eyebrow">Private dashboard</div>
      <h1>登入 Rox Investment</h1>
      <p className="muted">
        這是私人投資學習工具。請輸入你在 Vercel 設定的存取密碼。
      </p>
      <label>
        存取密碼
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          required
          autoFocus
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "登入中…" : "登入"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
