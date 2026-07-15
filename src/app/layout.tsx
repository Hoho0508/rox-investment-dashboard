import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Rox Investment Dashboard",
  description: "投資學習、資料整理、風險辨識與紀律管理工具",
  applicationName: "Rox 投資",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Rox 投資",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
