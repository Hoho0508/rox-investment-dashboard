import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rox Investment Dashboard",
    short_name: "Rox 投資",
    description: "台股即時研究、每日報告與投資紀律管理工具",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1120",
    theme_color: "#0f766e",
    lang: "zh-Hant",
    orientation: "any",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "每日報告", short_name: "報告", url: "/reports" },
      { name: "即時台股", short_name: "台股", url: "/stocks" },
      { name: "投資日誌", short_name: "日誌", url: "/journal" },
    ],
  };
}
