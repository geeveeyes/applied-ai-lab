import type { EstimateRow } from "./providers/types";
import type { ReverseDcf } from "./types";

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
    .filter((x) => x.date && x.epsAvg && x.epsAvg > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return usable.find((x) => String(x.date) >= target) ?? usable[usable.length - 1];
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
  if (!marketCap || !baseFcf || baseFcf <= 0 || discountRate <= terminalGrowth) {
    return { available: false, note: "Reverse DCF unavailable because market cap or positive annual free cash flow is missing." };
  }

  let low = -0.50;
  let high = 1.00;
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
    note: "Simplified expectations test: constant annual FCF growth for 10 years, then 3% terminal growth, discounted at 10%. It ignores net cash/debt and changing margins, so use it as an expectations gauge rather than intrinsic value.",
  };
}
