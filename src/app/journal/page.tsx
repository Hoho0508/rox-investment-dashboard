import { JournalForm } from "@/components/journal-form";
export default function JournalPage() {
  return (
    <>
      <div className="topline">
        <div>
          <div className="eyebrow">Decision Journal</div>
          <h1>投資日誌</h1>
          <p className="muted">
            先留下證據、風險與失效條件，再決定是否形成正式計畫。
          </p>
        </div>
      </div>
      <JournalForm />
    </>
  );
}
