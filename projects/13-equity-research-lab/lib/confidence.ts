import type { Citation, DimensionCoverage } from "./types";
import type { EstimateRow } from "./providers/types";
import { weightedCoverage } from "./scoring";
import { estimateDispersion } from "./valuation";

export function ageDays(asOf: string, date?: string) {
  if (!date) return Infinity;
  const age = (Date.parse(asOf) - Date.parse(date)) / 86400000;
  return Number.isFinite(age) && age >= -1 ? Math.max(0, age) : Infinity;
}

export function deterministicConfidence(input: {
  coverage: DimensionCoverage; asOf: string; marketAsOf?: string;
  annualEnd?: string; quarterEnd?: string; estimate?: EstimateRow; citations: Citation[];
}) {
  const breadth = weightedCoverage(input.coverage);
  const fresh = (age: number, limit: number) => age <= limit ? 100 : age <= limit * 2 ? 50 : 0;
  const freshness = .4 * fresh(ageDays(input.asOf, input.marketAsOf), 4) +
    .3 * fresh(ageDays(input.asOf, input.annualEnd), 460) + .3 * fresh(ageDays(input.asOf, input.quarterEnd), 190);
  const sources = [...new Map(input.citations.map(c => [c.url, c])).values()];
  const primary = sources.length ? 100 * sources.filter(c => c.tier === 1).length / sources.length : 0;
  const analystCount = Math.max(0, input.estimate?.numAnalystsEps ?? 0);
  const estimateBreadth = Math.min(100, analystCount / 20 * 100);
  const dispersion = estimateDispersion(input.estimate);
  const agreement = dispersion == null ? 0 : Math.max(0, 100 * (1 - dispersion));
  const quality = .55 + .20 * freshness / 100 + .10 * primary / 100 + .10 * estimateBreadth / 100 + .05 * agreement / 100;
  const raw = breadth * quality;
  // Fresh quotes cannot compensate for absent fundamentals or valuation evidence.
  const criticalMissing = !input.annualEnd || !input.estimate || ageDays(input.asOf, input.marketAsOf) > 7;
  const score = Math.round(Math.min(raw, breadth, criticalMissing ? 49 : 100));
  return { score, breadth, freshness, primary, estimateBreadth, agreement,
    note: `Evidence confidence ${score}/100 (not a probability of investment success). Formula: coverage (${breadth}) × [55% baseline + 20% freshness (${freshness.toFixed(0)}), 10% primary-source ratio (${primary.toFixed(0)}), 10% EPS analyst breadth (${estimateBreadth.toFixed(0)}), 5% estimate agreement (${agreement.toFixed(0)})]. Each quality input is scaled to 0–1. Capped by coverage${criticalMissing ? " and at 49 for missing critical evidence or stale price" : ""}. Estimate publication dates are unavailable; retrieval does not prove estimate freshness.` };
}
