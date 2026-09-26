import type { ResearchRun } from "@/lib/types";
import { investmentDecision, plainSummary } from "@/lib/decision";
import { factorKeys, factorLabels } from "@/lib/investment";
export function ExecutiveSummary({ run }: { run: ResearchRun }) {
  const summary = plainSummary(run), decision = investmentDecision(run);
  return <section className="panel executive" aria-labelledby="executive-heading">
    <p className="eyebrow">THE INVESTMENT DECISION · 12-MONTH VIEW</p><h2 id="executive-heading">{decision.action}</h2>
    <div className="two-col"><div><h3>How is {run.companyName} doing?</h3><p className="lede">{summary.overview}</p><p><strong>What looks good:</strong> {summary.strength}</p><p><strong>What worries us:</strong> {summary.concern}</p></div>
    <div className="decision-box"><p className="eyebrow">Investment score</p><strong className="big-score">{decision.score === null ? "Not rated" : `${decision.score}/100`}</strong><p>Higher means a stronger case for owning shares at the recorded price.</p><h3>{decision.action}</h3><p>{decision.reason}</p><p><strong>Already own it?</strong> {decision.ownedAction}</p></div></div>
    {run.investmentCase && <><p><strong>Growth potential:</strong> {run.investmentCase.growthOutlook}</p><p><strong>The strongest counterargument:</strong> {run.investmentCase.strongestCounterargument}</p><p><strong>What would change the decision:</strong> {run.investmentCase.changeMind}</p></>}
    <p><strong>What to watch next:</strong> {summary.watchFor}</p>
    {decision.missing.length > 0 && <p><strong>Still unresolved:</strong> {decision.missing.join("; ")}.</p>}
    {!run.investmentCase && <p>This archived report predates the unified method. <a href={`/company/${encodeURIComponent(run.ticker)}`}>Run fresh research</a> to get the new score; its historical evidence remains below.</p>}
    {run.investmentCase && <details open><summary>Evidence behind the decision</summary><div className="two-col">{factorKeys.map(key => { const factor = run.investmentCase!.factors[key]; return <article key={key}><h3>{factorLabels[key]} · {factor.rating}</h3><p>{factor.reason}</p><small>{factor.evidenceDate ? `Evidence dated ${factor.evidenceDate}. ` : ""}{factor.sources.map((url,i) => <span key={url}><a href={url} target="_blank" rel="noreferrer">Source {i+1}</a>{" "}</span>)}</small></article>; })}</div></details>}
    <details><summary>How the one score works</summary><p>A directional research aid, not a probability of profit or an options timing signal. Growth and cash each contribute 20%, valuation 25%, competition 15%, execution and market conditions 10% each. Evidence-backed ratings map to 10, 30, 50, 70 or 90. Unknown factors are neutral. At least four supported factors, including growth and cash, and a recent verified price are required. Without valuation evidence, the score stays in the hold/wait range. Source links establish provenance, not guaranteed accuracy; the underlying assessments remain model judgments.</p><p>70–100: buy candidate. 60–69: watch for a better entry. 40–59: hold/wait. Below 40: avoid/review selling. These policy thresholds are not statistically calibrated or backtested. The score describes this saved report, not a live trading signal.</p></details>
  </section>;
}
