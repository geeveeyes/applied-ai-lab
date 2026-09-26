import type { ResearchRun } from "@/lib/types";
import { investmentDecision, plainSummary } from "@/lib/decision";
export function ExecutiveSummary({ run }: { run: ResearchRun }) {
  const summary = plainSummary(run), decision = investmentDecision(run);
  return <section className="panel executive" aria-labelledby="executive-heading">
    <p className="eyebrow">THE REPORT IN PLAIN ENGLISH</p><h2 id="executive-heading">How is {run.companyName} doing?</h2>
    <p className="lede">{summary.overview}</p>
    <div className="two-col"><div><h3>What looks good</h3><p>{summary.strength}</p><h3>What worries us</h3><p>{summary.concern}</p></div>
      <div className="decision-box"><p className="eyebrow">Investment confidence</p><strong className="big-score">{decision.available ? `${decision.confidence}/100` : "Not assessable"}</strong><p>Support for committing new money now</p><h3>{decision.action}</h3><p>{decision.reason}</p></div></div>
    <p><strong>What to watch next:</strong> {summary.watchFor}</p>
    {decision.missing.length > 0 && <p><strong>Still needed:</strong> {decision.missing.join("; ")}.</p>}
    <details><summary>How to read these scores</summary><p>Investment confidence is a conservative decision aid: research score ({run.score}/100) × evidence confidence ({run.confidence}/100), rounded to a whole number. It is not the probability of making money or a personalized suitability assessment. Evidence confidence measures the report’s support; the research score rates the company using that evidence. Missing evidence lowers conviction, not necessarily business quality. These are the original report’s scores, not a current market signal.</p></details>
  </section>;
}
