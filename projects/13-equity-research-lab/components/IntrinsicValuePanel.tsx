import { sensitivity, type IntrinsicValuation } from "@/lib/intrinsic-valuation";
import { MARGIN_OF_SAFETY } from "@/lib/quick-check";

export function IntrinsicValuePanel({ v, price }: { v: IntrinsicValuation; price: number }) {
  if (!v.available) return <section className="panel"><h2>Intrinsic value</h2><p>Not calculated: {v.note}</p><p className="muted">Without a valuation, the decision cannot reach a buy signal.</p></section>;
  return <section className="panel">
    <h2>Intrinsic value (deterministic DCF)</h2>
    <p><strong>${v.perShare.base.toFixed(2)}</strong> per share base case (bear ${v.perShare.bear.toFixed(2)} · bull ${v.perShare.bull.toFixed(2)}) versus a price of ${price.toFixed(2)}: <strong>{v.upsidePct >= 0 ? "+" : ""}{v.upsidePct.toFixed(1)}%</strong> → model result <strong>{v.decisionEligible ? v.rating : "Illustrative only"}</strong>{v.ratingCapped ? " (capped)" : ""}.</p>
    {v.decisionEligible ? <p>Buy below <strong>${(v.perShare.base * (1 - MARGIN_OF_SAFETY)).toFixed(2)}</strong> for a {MARGIN_OF_SAFETY * 100}% margin of safety against the base value.</p> : <p>Illustrative estimate only. Missing inputs prevent a buy-below threshold.</p>}
    {(() => { const s = sensitivity(v); return s && <div className="table-wrap"><table><thead><tr><th>Growth vs base ↓ / discount rate →</th>{s.rates.map(r => <th key={r}>{(r * 100).toFixed(0)}%</th>)}</tr></thead><tbody>{s.grid.map((row, i) => <tr key={i}><td>{s.shifts[i] > 0 ? "+" : ""}{(s.shifts[i] * 100).toFixed(0)} pts ({((v.growth + s.shifts[i]) * 100).toFixed(1)}%)</td>{row.map((x, j) => <td key={j} style={{ fontWeight: x >= price ? 600 : 400 }}>${x.toFixed(2)}</td>)}</tr>)}</tbody></table></div>; })()}
    <p className="muted">Bold cells are at or above today&apos;s price. Rating bands: ≥ +30% very strong, +10–30% strong, ±10% mixed, −10 to −30% weak, below −30% very weak. Computed in code ({v.version}); the AI only critiques it.</p>
    <ul>{v.assumptions.map(a => <li key={a} className="muted">{a}</li>)}</ul>
    {v.warnings.length > 0 && <ul>{v.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
  </section>;
}
