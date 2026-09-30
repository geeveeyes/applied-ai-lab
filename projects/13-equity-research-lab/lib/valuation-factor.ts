import type { InvestmentCase } from "./investment";
import type { IntrinsicValuation } from "./intrinsic-valuation";

const points = { "Very weak": 10, Weak: 30, Mixed: 50, Strong: 70, "Very strong": 90, Unknown: 50 } as const;

/**
 * The valuation factor is set in code, not by the model. When a deterministic DCF is
 * available it becomes the valuation rating. If the model also produced a peer-based
 * rating from a complete peer table, the more conservative of the two wins, so a buy
 * needs both views to agree the price is reasonable.
 */
export function applyDeterministicValuation(
  thesis: InvestmentCase, v: IntrinsicValuation,
  ctx: { secUrl?: string; asOf: string; peerComparable: boolean },
): InvestmentCase {
  if (!v.available || !ctx.secUrl) return thesis;
  if(!v.decisionEligible){
    if(thesis.valuationBasis==='Peer comparison'&&ctx.peerComparable)return thesis;
    return {...thesis,valuationBasis:'Unavailable',valuationBenchmark:'Illustrative model lacks decision-grade inputs.',factors:{...thesis.factors,valuation:{...thesis.factors.valuation,rating:'Unknown',reason:`${v.warnings.join(' ')} Model critique: ${thesis.factors.valuation.reason}`}}};
  }
  const factor = thesis.factors.valuation;
  const peerRating = ctx.peerComparable && thesis.valuationBasis === "Peer comparison" && factor.rating !== "Unknown" ? factor.rating : undefined;
  const final = peerRating && points[peerRating] < points[v.rating] ? peerRating : v.rating;
  const summary = `Deterministic DCF (${v.basis.toLowerCase()}): intrinsic value $${v.perShare.base.toFixed(2)} per share (bear $${v.perShare.bear.toFixed(2)}, bull $${v.perShare.bull.toFixed(2)}), ${v.upsidePct >= 0 ? "+" : ""}${v.upsidePct.toFixed(1)}% versus today's price → ${v.rating}.`
    + (peerRating ? ` Peer comparison rated ${peerRating}; the more conservative rating (${final}) is used.` : "")
    + (v.ratingCapped ? " Rating capped because no consensus growth forecast was available." : "")
    + (v.warnings.length ? ` Caveats: ${v.warnings.join(" ")}` : "");
  const critique = factor.reason.trim();
  return {
    ...thesis,
    valuationBasis: "Independent cash-flow valuation",
    valuationBenchmark: `DCF base $${v.perShare.base.toFixed(2)} (range $${v.perShare.bear.toFixed(2)}–$${v.perShare.bull.toFixed(2)})${peerRating ? " cross-checked against peers" : ""}`,
    factors: {
      ...thesis.factors,
      valuation: {
        rating: final,
        reason: critique ? `${summary} Model critique: ${critique}` : summary,
        sources: [ctx.secUrl, ...factor.sources.filter(u => u !== ctx.secUrl)].slice(0, 5),
        evidenceDate: ctx.asOf,
      },
    },
  };
}
