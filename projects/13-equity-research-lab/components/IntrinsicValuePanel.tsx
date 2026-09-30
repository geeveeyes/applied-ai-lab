import type { IntrinsicValuation } from "@/lib/intrinsic-valuation";

export function IntrinsicValuePanel({ v, price }: { v: IntrinsicValuation; price: number }) {
  if (!v.available) return <section className="panel"><h2>Intrinsic value</h2><p>Not calculated: {v.note}</p><p className="muted">Without a valuation, the decision cannot reach a buy signal.</p></section>;
  return <section className="panel">
    <h2>Intrinsic value (deterministic DCF)</h2>
    <p><strong>${v.perShare.base.toFixed(2)}</strong> per share base case (bear ${v.perShare.bear.toFixed(2)} · bull ${v.perShare.bull.toFixed(2)}) versus a price of ${price.toFixed(2)}: <strong>{v.upsidePct >= 0 ? "+" : ""}{v.upsidePct.toFixed(1)}%</strong> → valuation rated <strong>{v.rating}</strong>{v.ratingCapped ? " (capped)" : ""}.</p>
    <p className="muted">Rating bands: ≥ +30% very strong, +10–30% strong, ±10% mixed, −10 to −30% weak, below −30% very weak. Computed in code ({v.version}); the AI only critiques it.</p>
    <ul>{v.assumptions.map(a => <li key={a} className="muted">{a}</li>)}</ul>
    {v.warnings.length > 0 && <ul>{v.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
  </section>;
}
