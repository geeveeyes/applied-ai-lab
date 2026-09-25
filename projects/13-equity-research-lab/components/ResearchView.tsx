import type { ResearchRun } from "@/lib/types";
import { ScoreGrid } from "./ScoreGrid";
import { SnapshotRecorder } from "./SnapshotRecorder";

function utcLabel(iso?: string) {
  if (!iso) return null;
  return iso.replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC");
}

function moneyBillions(value?: number) {
  return value == null ? "—" : `$${(value / 1e9).toFixed(1)}B`;
}

export function ResearchView({ run }: { run: ResearchRun }) {
  const hasScores = run.score > 0 && run.confidence > 0;
  return <>
    <SnapshotRecorder run={run} />
    <section className="hero compact">
      <div>
        <p className="eyebrow">{run.ticker} · {run.dataMode.toUpperCase()} DATA · {run.skillVersion}</p>
        <h1>{run.companyName}</h1>
        <p>
          {run.asOfPrice > 0 ? <>Market price <strong>${run.asOfPrice.toFixed(2)}</strong>{run.marketAsOf ? <> · market timestamp {utcLabel(run.marketAsOf)}</> : null}<br /></> : null}
          Research generated {utcLabel(run.analyzedAt)}
        </p>
      </div>
      <div className="verdict">
        <span>Research verdict</span><strong>{run.verdict}</strong>
        <small>{hasScores ? `Score ${run.score}/100 · confidence ${run.confidence}%` : "Awaiting sufficient verified evidence"}</small>
      </div>
    </section>

    {run.dataMode === "demo" && <div className="warning"><strong>Demo mode.</strong> Placeholder scores are for product development only, not an investment decision.</div>}
    {run.dataMode !== "demo" && !hasScores && <div className="warning"><strong>Live-data mode, incomplete analysis.</strong> The app did not substitute demo scores when a provider or AI synthesis failed. Check Research notes below.</div>}

    {hasScores && <section>
      <h2>Research scorecard</h2>
      <p className="muted">Scores are evidence-adjusted. A weakly researched dimension cannot receive an extreme score simply from model prior knowledge.</p>
      <ScoreGrid scores={run.scores} coverage={run.dimensionCoverage} />
    </section>}

    <div className="two-col">
      <section className="panel"><h2>Expectation gap</h2><p>{run.expectationGap}</p><h3>Valuation</h3><p>{run.valuationSummary}</p></section>
      <section className="panel"><h2>Catalysts</h2>{run.catalysts.length ? <ul>{run.catalysts.map(x => <li key={x}>{x}</li>)}</ul> : <p className="muted">Not available.</p>}<h3>Risks</h3>{run.risks.length ? <ul>{run.risks.map(x => <li key={x}>{x}</li>)}</ul> : <p className="muted">Not available.</p>}</section>
    </div>

    {run.reverseDcf && <section className="panel">
      <h2>Reverse DCF · what must the price be assuming?</h2>
      {run.reverseDcf.available ? <>
        <p>At the current market capitalization of <strong>{moneyBillions(run.reverseDcf.marketCap)}</strong>, a simplified cash-flow model requires roughly <strong>{((run.reverseDcf.impliedFcfGrowth ?? 0) * 100).toFixed(1)}% annual FCF growth</strong> for {run.reverseDcf.explicitYears} years from a base of {moneyBillions(run.reverseDcf.baseFreeCashFlow)}.</p>
        <p className="muted">Assumptions: {((run.reverseDcf.discountRate ?? 0) * 100).toFixed(0)}% discount rate · {((run.reverseDcf.terminalGrowth ?? 0) * 100).toFixed(0)}% terminal growth. {run.reverseDcf.note}</p>
      </> : <p className="muted">{run.reverseDcf.note}</p>}
    </section>}

    {run.scenarios.length > 0 && <section><h2>12-month bull / base / bear</h2><div className="scenario-grid">{run.scenarios.map(s => <article className="panel" key={s.label}><p className="eyebrow">{s.label} · {s.probability}%</p><h3>${s.fairValue.toFixed(2)}</h3><ul>{s.thesis.map(x => <li key={x}>{x}</li>)}</ul>{s.assumptions?.length ? <><p className="muted"><strong>{s.valuationMethod}</strong></p><ul>{s.assumptions.map(x => <li key={x} className="muted">{x}</li>)}</ul></> : null}</article>)}</div></section>}

    {run.thesisKillers.length > 0 && <section className="panel"><h2>What would make us change our mind?</h2><ul>{run.thesisKillers.map(x => <li key={x}>{x}</li>)}</ul></section>}

    <section><h2>Analyst intelligence</h2><p>{run.analystSummary}</p>
      {run.analysts.length > 0 ? <div className="table-wrap"><table><thead><tr><th>Analyst</th><th>Firm</th><th>Rating</th><th>Target</th><th>Success</th><th>Avg return</th></tr></thead><tbody>{run.analysts.map((a, i) => <tr key={`${a.analyst}-${i}`}><td>{a.analyst}</td><td>{a.firm}</td><td>{a.rating}</td><td>{a.priceTarget ? `$${a.priceTarget.toFixed(2)}` : "—"}</td><td>{a.successRate != null ? `${a.successRate}%` : "—"}</td><td>{a.averageReturn != null ? `${a.averageReturn}%` : "—"}</td></tr>)}</tbody></table></div>
      : <p className="muted">Individual analyst identities/track records are unavailable on the current data plan. Aggregated estimates and consensus data may still be used by the AI synthesis.</p>}
    </section>

    {run.optionIdeas.length > 0 && <section><h2>Options decision frame</h2><p className="muted">No specific option contract is recommended without a live chain, Greeks, IV and liquidity data.</p><div className="scenario-grid">{run.optionIdeas.map(o => <article className="panel" key={o.strategy}><p className="eyebrow">FIT: {o.fit}</p><h3>{o.strategy}</h3><p>{o.rationale}</p><small>Max loss: {o.maxLoss} · Capital: {o.capitalProfile} · IV: {o.volatilityView}</small></article>)}</div></section>}

    <section className="panel"><h2>Sources</h2>{run.citations.length ? <ol>{run.citations.map((c, i) => <li key={`${c.url}-${i}`}><a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> <span className="muted">— {c.source}, tier {c.tier}, retrieved {new Date(c.retrievedAt).toISOString().slice(0, 10)}</span></li>)}</ol> : <p className="muted">No verified sources loaded.</p>}</section>
    {run.notes.length > 0 && <section className="panel"><h2>Research notes</h2><ul>{run.notes.map((x, i) => <li key={`${x}-${i}`}>{x}</li>)}</ul></section>}
  </>;
}
