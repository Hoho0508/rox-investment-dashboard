import type { MarketPulse } from "@/lib/intelligence/market-pulse";

export function MarketPulseView({ pulse }: { pulse: MarketPulse }) {
  return (
    <section className="pulse-card section">
      <div className="pulse-header">
        <div>
          <div className="eyebrow">AI Market Intelligence</div>
          <h2>今日市場脈動</h2>
        </div>
        <div className="pulse-score">
          <strong>{pulse.sentiment.score}</strong>
          <span>{pulse.sentiment.label}</span>
        </div>
      </div>
      {pulse.warning && <p className="notice">{pulse.warning}</p>}
      <div className="pulse-grid">
        <div>
          <h3>🔥 今日最強族群</h3>
          <ol>
            {pulse.strongestGroups.map((group) => (
              <li key={group}>{group}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3>💰 今日資金流向</h3>
          <ul>
            {pulse.fundFlows.map((flow) => (
              <li key={flow.sector}>
                <b>{flow.direction}</b> {flow.sector}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>🧠 AI 判斷</h3>
          <p>目前市場正在交易：</p>
          <blockquote>「{pulse.narrative}」</blockquote>
          <small>信心 {pulse.confidence}%</small>
        </div>
        <div>
          <h3>📊 核心追蹤</h3>
          <ul>
            {pulse.trackedHoldings.map((holding) => (
              <li key={holding.name}>
                <b>{holding.name}</b>：{holding.status}
              </li>
            ))}
          </ul>
        </div>
        <div className="pulse-strategy">
          <h3>🎯 今日策略</h3>
          {pulse.strategy.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>
      <details>
        <summary>查看 AI 判斷依據</summary>
        <ul>
          {pulse.narrativeEvidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
