import type { EstimateRow } from "./providers/types";
import type { Scenario } from "./types";

// Deterministic intrinsic valuation. All math lives here, in code; the LLM may critique
// the output but is never the valuation source. Inputs come only from SEC filings and
// the market/consensus provider. Nothing is invented: when an input is missing the
// module says so and returns `available: false` or a flagged, capped result.

export const VALUATION_VERSION = "intrinsic-dcf-v1";
export const POLICY = {
  explicitYears: 10,
  highGrowthYears: 5,
  terminalGrowth: 0.025,
  discountRate: { bear: 0.10, base: 0.09, bull: 0.08 },
  growthShift: { bear: -0.04, base: 0, bull: 0.03 },
  growthBounds: [-0.05, 0.25] as const,
  heavyInvestmentCapexShare: 0.6,
  noForecastGrowth: 0.025,
};

export type ValuationInputs = {
  price?: number;
  marketCap?: number;
  revenue?: number;
  operatingCashFlow?: number;
  capitalExpenditures?: number;
  freeCashFlow?: number;
  netIncome?: number;
  cash?: number;
  debt?: number;
  annualPeriodEnd?: string;
  estimates?: EstimateRow[];
  /** Set for banks/insurers: operating cash flow mixes deposits and lending, so a corporate DCF is invalid. */
  financialInstitution?: boolean;
  /** Commodity-cyclical business: current cash earnings may be far from mid-cycle. */
  cyclical?: boolean;
};

export type ValuationRating = "Very weak" | "Weak" | "Mixed" | "Strong" | "Very strong";
export type IntrinsicValuation =
  | { available: false; version: string; note: string }
  | {
      available: true; version: string;
      basis: "Free cash flow" | "Net income (free cash flow depressed by heavy investment)";
      baseCashEarnings: number; growth: number; growthSource: string;
      shares: number; netCash?: number;
      perShare: { bear: number; base: number; bull: number };
      upsidePct: number; rating: ValuationRating; ratingCapped: boolean;
      assumptions: string[]; warnings: string[];
    };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const finite = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Revenue CAGR implied by the furthest consensus estimate within 3 years of the last annual period. */
export function consensusGrowth(revenue: number | undefined, periodEnd: string | undefined, estimates: EstimateRow[] = []) {
  if (!finite(revenue) || revenue <= 0 || !periodEnd) return undefined;
  const end = Date.parse(periodEnd);
  if (!Number.isFinite(end)) return undefined;
  const usable = estimates
    .filter(e => e.date && finite(e.revenueAvg) && e.revenueAvg! > 0)
    .map(e => ({ e, years: (Date.parse(e.date!) - end) / (365.25 * 86400000) }))
    .filter(x => Number.isFinite(x.years) && x.years >= 0.75 && x.years <= 3.25)
    .sort((a, b) => b.years - a.years);
  const pick = usable[0];
  if (!pick) return undefined;
  const years = Math.max(1, Math.round(pick.years));
  return { growth: Math.pow(pick.e.revenueAvg! / revenue, 1 / years) - 1, years, date: pick.e.date! };
}

/** Present value of 10 years of cash earnings (5 at g, 5 fading to terminal) plus a Gordon terminal value. */
export function presentValue(base: number, g: number, r: number, terminal = POLICY.terminalGrowth) {
  if (!(r > terminal)) throw new Error("Discount rate must exceed terminal growth");
  let cash = base, pv = 0;
  for (let year = 1; year <= POLICY.explicitYears; year++) {
    const growth = year <= POLICY.highGrowthYears ? g
      : g + (terminal - g) * ((year - POLICY.highGrowthYears) / (POLICY.explicitYears - POLICY.highGrowthYears));
    cash *= 1 + growth;
    pv += cash / Math.pow(1 + r, year);
  }
  return pv + (cash * (1 + terminal)) / (r - terminal) / Math.pow(1 + r, POLICY.explicitYears);
}

export function ratingFor(upsidePct: number): ValuationRating {
  return upsidePct >= 30 ? "Very strong" : upsidePct >= 10 ? "Strong" : upsidePct > -10 ? "Mixed" : upsidePct > -30 ? "Weak" : "Very weak";
}

export function intrinsicValuation(i: ValuationInputs): IntrinsicValuation {
  const off = (note: string): IntrinsicValuation => ({ available: false, version: VALUATION_VERSION, note });
  if (i.financialInstitution) return off("Banks and insurers are not valued on corporate cash flow (deposits and lending flow through operating cash). Use the price/book peer comparison instead.");
  if (!finite(i.price) || i.price <= 0 || !finite(i.marketCap) || i.marketCap <= 0) return off("A verified price and market capitalization are required.");
  if (!finite(i.revenue) || i.revenue <= 0) return off("Latest annual revenue from SEC filings is missing.");
  const shares = i.marketCap / i.price;
  const warnings: string[] = [];

  let basis: "Free cash flow" | "Net income (free cash flow depressed by heavy investment)";
  let base: number;
  const heavy = finite(i.operatingCashFlow) && finite(i.capitalExpenditures) && i.operatingCashFlow > 0 && i.capitalExpenditures > POLICY.heavyInvestmentCapexShare * i.operatingCashFlow;
  if (finite(i.freeCashFlow) && i.freeCashFlow > 0 && !heavy) { basis = "Free cash flow"; base = i.freeCashFlow; }
  else if (finite(i.netIncome) && i.netIncome > 0) {
    basis = "Net income (free cash flow depressed by heavy investment)"; base = i.netIncome;
    warnings.push(heavy ? "Capital spending exceeds 60% of operating cash flow, so reported free cash flow understates steady-state cash earnings. Net income is used as a proxy; this assumes today's investment eventually earns its cost of capital."
      : "Free cash flow is negative or unavailable; net income is used as a proxy for cash earnings.");
  } else return off("Positive free cash flow or net income is required; a loss-making company cannot be valued on current cash earnings.");

  const forecast = consensusGrowth(i.revenue, i.annualPeriodEnd, i.estimates);
  const [lo, hi] = POLICY.growthBounds;
  const growth = forecast ? clamp(forecast.growth, lo, hi) : POLICY.noForecastGrowth;
  const growthSource = forecast
    ? `Consensus revenue ${forecast.years}-year CAGR to fiscal period ending ${forecast.date}: ${(forecast.growth * 100).toFixed(1)}%${forecast.growth !== growth ? `, clamped to ${(growth * 100).toFixed(1)}%` : ""}`
    : `No usable consensus revenue forecast; inflation-only ${(growth * 100).toFixed(1)}% growth assumed`;
  if (!forecast) warnings.push("No consensus revenue forecast was available, so growth is an inflation-only placeholder and the rating is capped at Strong/Weak.");

  let netCash: number | undefined;
  if (finite(i.cash) || finite(i.debt)) netCash = (finite(i.cash) ? i.cash : 0) - (finite(i.debt) ? i.debt : 0);
  if (!finite(i.cash) || !finite(i.debt)) warnings.push(`Balance sheet ${!finite(i.cash) && !finite(i.debt) ? "cash and debt are" : !finite(i.cash) ? "cash is" : "debt is"} unavailable from SEC facts; ${netCash === undefined ? "net cash is treated as zero" : "only the reported side is included"}.`);

  const perShare = (k: "bear" | "base" | "bull") => {
    const g = clamp(growth + POLICY.growthShift[k], lo, hi + 0.05);
    const equity = presentValue(base, g, POLICY.discountRate[k]) + (netCash ?? 0);
    return Number(Math.max(0, equity / shares).toFixed(2));
  };
  const values = { bear: perShare("bear"), base: perShare("base"), bull: perShare("bull") };
  const upsidePct = Number(((values.base / i.price - 1) * 100).toFixed(1));
  let rating = ratingFor(upsidePct);
  if (i.cyclical) warnings.push("Commodity-cyclical business: the latest year's cash earnings may be far from mid-cycle, so the rating is capped at Strong/Weak. Check normalized commodity-price assumptions.");
  const ratingCapped = (!forecast || !!i.cyclical) && (rating === "Very strong" || rating === "Very weak");
  if (ratingCapped) rating = rating === "Very strong" ? "Strong" : "Weak";

  return {
    available: true, version: VALUATION_VERSION, basis, baseCashEarnings: base, growth, growthSource, shares, netCash,
    perShare: values, upsidePct, rating, ratingCapped, warnings,
    assumptions: [
      `Cash-earnings base: ${basis.toLowerCase()} of $${(base / 1e9).toFixed(2)}B for the fiscal year ending ${i.annualPeriodEnd ?? "unknown"} (SEC).`,
      `${growthSource}. Years 1–5 grow at this rate, years 6–10 fade linearly to ${(POLICY.terminalGrowth * 100).toFixed(1)}% terminal growth.`,
      `Discount rates: bear ${POLICY.discountRate.bear * 100}%, base ${POLICY.discountRate.base * 100}%, bull ${POLICY.discountRate.bull * 100}%. Bear/bull growth shifts: ${POLICY.growthShift.bear * 100} / +${POLICY.growthShift.bull * 100} points.`,
      `Shares: market cap ÷ price = ${(shares / 1e6).toFixed(0)}M. Net cash: ${netCash === undefined ? "unavailable (treated as 0)" : `$${(netCash / 1e9).toFixed(1)}B`}.`,
      "Excludes stock-based-compensation dilution, buybacks and dividends. Intrinsic value estimates are not 12-month price targets; markets can stay mispriced for years.",
    ],
  };
}

/** Bear/base/bull intrinsic values as report scenarios (replaces the price-anchored P/E stress). */
export function valuationScenarios(v: IntrinsicValuation, price: number): Scenario[] {
  if (!v.available || !(price > 0)) return [];
  const row = (label: Scenario["label"], key: "bear" | "base" | "bull", probability: number, thesis: string): Scenario => ({
    label, probability, fairValue: v.perShare[key], returnPct: Number(((v.perShare[key] / price - 1) * 100).toFixed(1)),
    valuationMethod: `Deterministic DCF on ${v.basis.toLowerCase()} (${VALUATION_VERSION}); intrinsic value, not a 12-month target`,
    thesis: [thesis], assumptions: v.assumptions,
  });
  return [
    row("Bull", "bull", 25, "Growth 3 points above consensus and an 8% discount rate."),
    row("Base", "base", 50, "Consensus-implied growth, fading to 2.5%, discounted at 9%."),
    row("Bear", "bear", 25, "Growth 4 points below consensus and a 10% discount rate."),
  ];
}

/** Base-case value per share across discount rates and growth shifts (for a sensitivity grid). */
export function sensitivity(v: IntrinsicValuation, rates = [0.08, 0.09, 0.10], shifts = [-0.04, -0.02, 0, 0.02]) {
  if (!v.available) return null;
  const [lo, hi] = POLICY.growthBounds;
  return {
    rates, shifts,
    grid: shifts.map(sh => rates.map(r => Number(Math.max(0, (presentValue(v.baseCashEarnings, Math.min(hi + 0.05, Math.max(lo, v.growth + sh)), r) + (v.netCash ?? 0)) / v.shares).toFixed(2)))),
  };
}
