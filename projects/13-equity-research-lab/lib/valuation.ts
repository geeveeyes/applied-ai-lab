import type { EstimateRow } from "./providers/types";
import type { Scenario, ReverseDcf } from "./types";

export function addYearsIso(isoDate: string, years: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function selectHorizonEstimate(
  estimates: EstimateRow[],
  analysisDate: string,
  horizonYears = 1,
): EstimateRow | undefined {
  const target = addYearsIso(analysisDate, horizonYears);
  const usable = estimates
    .filter((x) => x.date && Number.isFinite(x.epsAvg) && (x.epsAvg ?? 0) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  // Never silently substitute an expired forecast or one more than a fiscal year away.
  return usable.find((x) => String(x.date) >= target && String(x.date) <= addYearsIso(target, 1));
}

function enterpriseValueFromFcf(
  baseFcf: number,
  growth: number,
  discountRate: number,
  terminalGrowth: number,
  years: number,
) {
  let pv = 0;
  let fcf = baseFcf;
  for (let year = 1; year <= years; year++) {
    fcf *= 1 + growth;
    pv += fcf / Math.pow(1 + discountRate, year);
  }
  const terminal = (fcf * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  return pv + terminal / Math.pow(1 + discountRate, years);
}

export function reverseDcfFromMarketCap(
  marketCap?: number,
  baseFcf?: number,
  discountRate = 0.10,
  terminalGrowth = 0.03,
  years = 10,
): ReverseDcf {
  if (!Number.isFinite(marketCap) || !marketCap || marketCap <= 0 || !Number.isFinite(baseFcf) || !baseFcf || baseFcf <= 0 || !Number.isFinite(discountRate) || !Number.isFinite(terminalGrowth) || discountRate <= terminalGrowth || terminalGrowth <= -1 || !Number.isInteger(years) || years < 1) {
    return { available: false, note: "Reverse DCF unavailable because market cap or positive annual free cash flow is missing." };
  }

  let low = -0.50;
  let high = 1.00;
  if (enterpriseValueFromFcf(baseFcf, low, discountRate, terminalGrowth, years) > marketCap ||
      enterpriseValueFromFcf(baseFcf, high, discountRate, terminalGrowth, years) < marketCap) {
    return { available: false, note: "Required growth lies outside the solver range (-50% to +100%); no boundary value is reported as a solution." };
  }
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const value = enterpriseValueFromFcf(baseFcf, mid, discountRate, terminalGrowth, years);
    if (value < marketCap) low = mid;
    else high = mid;
  }
  const implied = (low + high) / 2;
  return {
    available: true,
    marketCap,
    baseFreeCashFlow: baseFcf,
    discountRate,
    terminalGrowth,
    explicitYears: years,
    impliedFcfGrowth: implied,
    note: "Simplified expectations test: constant annual FCF growth for 10 years, then 3% terminal growth, discounted at 10%. The base is annual operating cash flow minus cash capex, not normalized free cash flow to equity. Heavy investment can depress this base and inflate implied growth. It omits net cash/debt, financing flows, stock-based compensation dilution and changing margins; use it only as a sensitivity gauge.",
  };
}

export function estimateDispersion(estimate?: EstimateRow): number | undefined {
  if (!estimate || !Number.isFinite(estimate.epsAvg) || !estimate.epsAvg || estimate.epsAvg <= 0 ||
      !Number.isFinite(estimate.epsLow) || !Number.isFinite(estimate.epsHigh) ||
      estimate.epsLow! > estimate.epsAvg || estimate.epsHigh! < estimate.epsAvg) return undefined;
  return (estimate.epsHigh! - estimate.epsLow!) / estimate.epsAvg;
}

export function calibratedScenarios(price: number, estimate: EstimateRow | undefined, targetDate: string): Scenario[] {
  if (!Number.isFinite(price) || price <= 0 || !estimate?.epsAvg || !Number.isFinite(estimate.epsAvg) || estimate.epsAvg <= 0) return [];
  const eps = estimate.epsAvg;
  const pe = price / eps;
  const dispersion = estimateDispersion(estimate);
  // Policy stresses, not fitted probabilities or evidence of intrinsic value.
  // Include reported estimate extremes when valid, with at least +/-10% earnings stress.
  const bearEps = dispersion == null ? eps * .8 : Math.max(0, Math.min(eps * .9, estimate.epsLow!));
  const bullEps = dispersion == null ? eps * 1.2 : Math.max(eps * 1.1, estimate.epsHigh!);
  return ([
    { label: "Bull", scenarioEps: bullEps, multipleFactor: 1.2, probability: 25 },
    { label: "Base", scenarioEps: eps, multipleFactor: 1, probability: 50 },
    { label: "Bear", scenarioEps: bearEps, multipleFactor: .8, probability: 25 },
  ] as const).map(s => {
    const multiple = pe * s.multipleFactor;
    const fairValue = Number((s.scenarioEps * multiple).toFixed(2));
    return {
      label: s.label, probability: s.probability, fairValue,
      returnPct: Number(((fairValue / price - 1) * 100).toFixed(1)),
      valuationMethod: "Earnings × price-anchored horizon P/E sensitivity",
      thesis: [s.label === "Base" ? "Consensus EPS and today's horizon P/E held constant: a neutral reference, not a fair-value forecast." :
        `${s.label === "Bear" ? "Earnings shortfall and 20% multiple compression" : "Earnings outperformance and 20% multiple expansion"} relative to today's same-period EPS basis.`],
      assumptions: [
        `12-month target date: ${targetDate}; fiscal EPS period end: ${estimate.date}`,
        `Consensus EPS: $${eps.toFixed(2)}; scenario EPS: $${s.scenarioEps.toFixed(2)}`,
        `Current horizon P/E: ${pe.toFixed(2)}×; scenario P/E: ${multiple.toFixed(2)}×`,
        dispersion == null ? "Estimate range unavailable or invalid; policy earnings stress is ±20%." : "Earnings stresses use the wider of the provider range or ±10%; negative bear EPS is floored at zero for this P/E test.",
        "25/50/25 weights and ±20% multiple shocks are illustrative policy assumptions, not calibrated probabilities. Excludes dividends.",
      ],
    };
  });
}
