import type { ResearchRun } from "@/lib/types";
import { ScoreGrid } from "./ScoreGrid";
import { SnapshotRecorder } from "./SnapshotRecorder";

export function ResearchView({ run }: { run: ResearchRun }) {
  return <>
    <SnapshotRecorder run={run} />
    <section className="hero compact">
      <div>
        <p className="eyebrow">{run.ticker} · {run.dataMode.toUpperCase()} DATA · {run.skillVersion}</p>
        <h1>{run.companyName}</h1>
        <p>As-of price <strong>${run.asOfPrice.toFixed(2)}</strong> · analyzed {new Date(run.analyzedAt).toLocaleString()}</p>
      </div>
      <div className="verdict">
        <span>Research verdict</span><strong>{run.verdict}</strong>
        <small>Score {run.score}/100 · confidence {run.confidence}%</small>
      </div>
    </section>

    {run.dataMode === "demo" && <div className="warning"><strong>Demo mode.</strong> Placeholder scores are for product development only, not an investment decision. Add live provider keys to use sourced market data.</div>}

    <section><h2>Research scorecard</h2><ScoreGrid scores={run.scores} /></section>

    <div className="two-col">
      <section className="panel"><h2>Expectation gap</h2><p>{run.expectationGap}</p><h3>Valuation</h3><p>{run.valuationSummary}</p></section>
      <section className="panel"><h2>Catalysts</h2><ul>{run.catalysts.map(x => <li key={x}>{x}</li>)}</ul><h3>Risks</h3><ul>{run.risks.map(x => <li key={x}>{x}</li>)}</ul></section>
    </div>

    <section><h2>Bull / base / bear</h2><div className="scenario-grid">{run.scenarios.map(s => <article className="panel" key={s.label}><p className="eyebrow">{s.label} · {s.probability}%</p><h3>${s.fairValue.toFixed(2)}</h3><ul>{s.thesis.map(x => <li key={x}>{x}</li>)}</ul></article>)}</div></section>

    <section className="panel"><h2>What would make us change our mind?</h2><ul>{run.thesisKillers.map(x => <li key={x}>{x}</li>)}</ul></section>

    <section><h2>Analyst intelligence</h2><p>{run.analystSummary}</p><div className="table-wrap"><table><thead><tr><th>Analyst</th><th>Firm</th><th>Rating</th><th>Target</th><th>Success</th><th>Avg return</th></tr></thead><tbody>{run.analysts.map((a, i) => <tr key={`${a.analyst}-${i}`}><td>{a.analyst}</td><td>{a.firm}</td><td>{a.rating}</td><td>{a.priceTarget ? `$${a.priceTarget.toFixed(2)}` : "—"}</td><td>{a.successRate != null ? `${a.successRate}%` : "—"}</td><td>{a.averageReturn != null ? `${a.averageReturn}%` : "—"}</td></tr>)}</tbody></table></div></section>

    <section><h2>Options decision frame</h2><p className="muted">Research comparison only. The engine should prefer shares or no trade whenever options do not improve the risk/reward.</p><div className="scenario-grid">{run.optionIdeas.map(o => <article className="panel" key={o.strategy}><p className="eyebrow">FIT: {o.fit}</p><h3>{o.strategy}</h3><p>{o.rationale}</p><small>Max loss: {o.maxLoss} · Capital: {o.capitalProfile} · IV: {o.volatilityView}</small></article>)}</div></section>

    <section className="panel"><h2>Sources</h2><ol>{run.citations.map((c, i) => <li key={`${c.url}-${i}`}><a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> <span className="muted">— {c.source}, tier {c.tier}, retrieved {new Date(c.retrievedAt).toLocaleDateString()}</span></li>)}</ol></section>
    {run.notes.length > 0 && <section className="panel"><h2>Research notes</h2><ul>{run.notes.map(x => <li key={x}>{x}</li>)}</ul></section>}
  </>;
}
