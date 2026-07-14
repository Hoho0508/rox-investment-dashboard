"use client";

import { usePathname } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login")
    return <main className="login-main">{children}</main>;
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        {children}
        <Disclaimer />
      </main>
    </div>
  );
}
