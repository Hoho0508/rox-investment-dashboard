import Link from "next/link";
import { TechnicalAnalysisWorkspace } from "@/components/technical-analysis-workspace";
import { taiwanSymbolSchema } from "@/lib/validation/schemas";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StockTechnicalPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const parsed = taiwanSymbolSchema.safeParse((await params).symbol);
  if (!parsed.success) notFound();
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Technical Analysis Center</div>
          <h1>{parsed.data} 技術分析中心</h1>
          <p className="muted">
            預設顯示 1 分鐘 K；可切換分鐘、日、週與月
            K。所有判斷都必須附證據與失效條件。
          </p>
        </div>
        <Link className="pill" href="/stocks">
          返回自選台股
        </Link>
      </div>
      <TechnicalAnalysisWorkspace symbol={parsed.data} />
    </>
  );
}
