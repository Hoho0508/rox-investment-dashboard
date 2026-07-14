import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card login-card">載入中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
