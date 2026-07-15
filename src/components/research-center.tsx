"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DataEnvelope } from "@/types/domain";
import type {
  BeginnerDecision,
  InvestorConferenceEvent,
  StockLibrary,
} from "@/types/research";

type Props = {
  events: DataEnvelope<InvestorConferenceEvent[]>;
  decisions: BeginnerDecision[];
  libraries: StockLibrary[];
  glossary: ReadonlyArray<{ term: string; explanation: string }>;
  initialSavedSymbols: string[];
  eventsFetchedAtLabel: string;
};

const modeLabels = {
  live: "LIVE",
  delayed: "DELAYED",
  stale: "STALE",
  manual: "MANUAL",
  mock: "MOCK",
  unavailable: "UNAVAILABLE",
} as const;

export function ResearchCenter({
  events,
  decisions,
  libraries,
  glossary,
  initialSavedSymbols,
  eventsFetchedAtLabel,
}: Props) {
  const [selected, setSelected] = useState(() => new Set<string>());
  const [saved, setSaved] = useState(() => new Set(initialSavedSymbols));
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const selectedCount = selected.size;
  const allSymbols = useMemo(
    () => [
      ...new Set(
        libraries.flatMap((library) =>
          library.stocks.map((stock) => stock.symbol),
        ),
      ),
    ],
    [libraries],
  );

  function toggle(symbol: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  async function saveSelection() {
    if (!selectedCount || pending) return;
    setPending(true);
    setStatus("正在儲存到自選股…");
    try {
      const response = await fetch("/api/watchlist/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: [...selected] }),
      });
      const payload = (await response.json()) as {
        saved?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "儲存失敗");
      setSaved((current) => new Set([...current, ...selected]));
      setStatus(`已將 ${payload.saved ?? selectedCount} 檔加入自選股。`);
      setSelected(new Set());
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "儲存失敗，請稍後再試。",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="research-center">
      <header className="topline">
        <div>
          <div className="eyebrow">BEGINNER RESEARCH CENTER</div>
          <h1>新手研究中心</h1>
          <p className="muted">
            先看事件與證據，再決定要不要深入研究；所有判斷都不是買賣指令。
          </p>
        </div>
        <span className="pill">法說雷達・白話判斷・股票倉庫</span>
      </header>

      <section className="section" aria-labelledby="event-radar-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">OFFICIAL EVENT RADAR</div>
            <h2 id="event-radar-title">近期法說雷達</h2>
          </div>
          <span className={`data-mode mode-${events.dataMode}`}>
            {modeLabels[events.dataMode]}
          </span>
        </div>
        {events.value === null ? (
          <div className="notice" role="status">
            <strong>官方法說資料目前無法顯示。</strong> {events.errorMessage}
          </div>
        ) : events.value.length === 0 ? (
          <div className="card empty">
            未查到未來 30 天的公開法說會；公司仍可能後續新增公告。
          </div>
        ) : (
          <div className="event-list">
            {events.value.slice(0, 12).map((event) => (
              <article
                className="card event-card"
                key={`${event.symbol}-${event.eventDate}-${event.eventTime}`}
              >
                <div className="event-date">
                  <strong>
                    {event.daysUntil === 0 ? "今天" : `${event.daysUntil} 天後`}
                  </strong>
                  <span>
                    {event.eventDate} {event.eventTime ?? "時間未定"}
                  </span>
                </div>
                <h3>
                  {event.symbol} {event.companyName}
                </h3>
                <p>{event.summary}</p>
                <small>
                  {event.market}・{event.location ?? "地點未公告"}
                </small>
              </article>
            ))}
          </div>
        )}
        <p className="source">
          來源：
          <a href={events.sourceUrl} target="_blank" rel="noreferrer">
            {events.sourceName}
          </a>
          ・抓取時間 {eventsFetchedAtLabel}
          。公司可能變更時間，研究前請回官方公告確認。
        </p>
      </section>

      <section className="section" aria-labelledby="beginner-title">
        <div className="eyebrow">EXPLAINABLE CHECK</div>
        <h2 id="beginner-title">新手快速判斷</h2>
        <div className="grid grid-3">
          {decisions.map((decision) => (
            <article className="card beginner-card" key={decision.symbol}>
              <div className="beginner-title">
                <span>{decision.symbol}</span>
                <h3>{decision.name}</h3>
              </div>
              <div className={`verdict beginner-${decision.verdict}`}>
                {decision.verdict}
              </div>
              <p>{decision.summary}</p>
              <h4>支持證據</h4>
              <ul>
                {decision.supporting.map((reason) => (
                  <li key={reason}>✓ {reason}</li>
                ))}
              </ul>
              <h4>反對證據</h4>
              <ul>
                {decision.opposing.map((reason) => (
                  <li key={reason}>△ {reason}</li>
                ))}
              </ul>
              <div className="risk-box">
                <strong>最大風險</strong>
                <span>{decision.biggestRisk}</span>
              </div>
              <div className="risk-box">
                <strong>失效條件</strong>
                <span>{decision.invalidation}</span>
              </div>
              <small>
                信心 {decision.confidence}%・{modeLabels[decision.dataMode]}・
                {decision.sourceName}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CURATED WATCHLIST LIBRARY</div>
            <h2 id="library-title">主題股票倉庫</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSelected(new Set(allSymbols))}
          >
            選取全部
          </button>
        </div>
        <p className="notice">
          每類是固定的 10
          檔研究代表清單，不是即時排行或投資推薦。選好後會儲存到你現有的私人自選股。
        </p>
        <div className="library-grid">
          {libraries.map((library) => (
            <fieldset className="card library-card" key={library.id}>
              <legend>{library.name}（10）</legend>
              <p>{library.description}</p>
              <div className="library-stocks">
                {library.stocks.map((stock) => (
                  <label
                    key={`${library.id}-${stock.symbol}`}
                    className={saved.has(stock.symbol) ? "saved" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(stock.symbol)}
                      onChange={() => toggle(stock.symbol)}
                      aria-label={`${stock.symbol} ${stock.name}`}
                    />
                    <span>
                      <b>{stock.symbol}</b> {stock.name}
                    </span>
                    <small>
                      {saved.has(stock.symbol) ? "已在自選" : stock.exchange}
                    </small>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="save-library-bar">
          <button
            type="button"
            disabled={!selectedCount || pending}
            onClick={saveSelection}
            className={pending ? "is-pending" : ""}
          >
            {pending ? "儲存中…" : `加入已選 ${selectedCount} 檔`}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSelected(new Set())}
            disabled={!selectedCount || pending}
          >
            清除選擇
          </button>
          <span role="status">{status}</span>
          <Link href="/stocks">前往自選股與 K 線 →</Link>
        </div>
      </section>

      <section className="section" aria-labelledby="glossary-title">
        <div className="eyebrow">PLAIN LANGUAGE</div>
        <h2 id="glossary-title">數據白話字典</h2>
        <div className="glossary-grid">
          {glossary.map((item) => (
            <article className="card" key={item.term}>
              <h3>{item.term}</h3>
              <p>{item.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
