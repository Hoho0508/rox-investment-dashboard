import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

const links = [
  ["/", "總覽"],
  ["/reports", "每日晨報"],
  ["/history", "歷史報告"],
  ["/stocks", "即時台股與 K 線"],
  ["/scoring", "進出場評分"],
  ["/journal", "投資日誌"],
  ["/data-status", "資料狀態"],
  ["/settings", "系統設定"],
  ["/guide", "使用說明"],
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        Rox Investment<small>投資學習與紀律儀表板</small>
      </div>
      <nav className="nav" aria-label="主要導覽">
        {links.map(([href, label]) => (
          <Link href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <LogoutButton />
    </aside>
  );
}
