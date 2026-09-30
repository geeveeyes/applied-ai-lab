import { describe, expect, it } from "vitest";
import { consensusGrowth, intrinsicValuation, presentValue, ratingFor, valuationScenarios, POLICY } from "../lib/intrinsic-valuation";
import { applyDeterministicValuation } from "../lib/valuation-factor";
import type { InvestmentCase } from "../lib/investment";

const base = {
  price: 100, marketCap: 100e9, revenue: 50e9, operatingCashFlow: 10e9, capitalExpenditures: 2e9,
  freeCashFlow: 8e9, netIncome: 7e9, cash: 5e9, debt: 3e9, annualPeriodEnd: "2025-12-31",
  estimates: [{ date: "2026-12-31", revenueAvg: 55e9 }, { date: "2027-12-31", revenueAvg: 60.5e9 }],
};

describe("intrinsic valuation", () => {
  it("derives consensus growth from the furthest estimate within three years", () => {
    const g = consensusGrowth(50e9, "2025-12-31", base.estimates)!;
    expect(g.years).toBe(2);
    expect(g.growth).toBeCloseTo(0.1, 3);
    expect(consensusGrowth(50e9, "2025-12-31", [])).toBeUndefined();
    expect(consensusGrowth(undefined, "2025-12-31", base.estimates)).toBeUndefined();
  });
  it("present value matches a zero-growth perpetuity when g equals terminal", () => {
    const pv = presentValue(1, POLICY.terminalGrowth, 0.09);
    expect(pv).toBeCloseTo(1.025 / (0.09 - 0.025), 6);
  });
  it("values a cash-generative company with ordered bear < base < bull", () => {
    const v = intrinsicValuation(base);
    if (!v.available) throw new Error(v.note);
    expect(v.basis).toBe("Free cash flow");
    expect(v.shares).toBeCloseTo(1e9);
    expect(v.netCash).toBe(2e9);
    expect(v.perShare.bear).toBeLessThan(v.perShare.base);
    expect(v.perShare.base).toBeLessThan(v.perShare.bull);
    expect(v.rating).toBe(ratingFor(v.upsidePct));
    expect(v.warnings).toEqual([]);
  });
  it("is not anchored to today's price (the old scenarios were)", () => {
    const a = intrinsicValuation(base), b = intrinsicValuation({ ...base, price: 200, marketCap: 200e9 });
    if (!a.available || !b.available) throw new Error("unavailable");
    expect(a.perShare.base).toBeCloseTo(b.perShare.base, 1);
    expect(b.upsidePct).toBeLessThan(a.upsidePct);
  });
  it("uses net income when capex dominates operating cash flow, with a warning", () => {
    const v = intrinsicValuation({ ...base, capitalExpenditures: 9e9, freeCashFlow: 1e9 });
    if (!v.available) throw new Error(v.note);
    expect(v.basis).toMatch(/Net income/);
    expect(v.warnings.join(" ")).toMatch(/Capital spending/);
  });
  it("refuses to value loss makers or missing prices instead of inventing inputs", () => {
    expect(intrinsicValuation({ ...base, freeCashFlow: -1e9, netIncome: -2e9 }).available).toBe(false);
    expect(intrinsicValuation({ ...base, price: undefined }).available).toBe(false);
    expect(intrinsicValuation({ ...base, revenue: undefined }).available).toBe(false);
    expect(intrinsicValuation({ ...base, financialInstitution: true }).available).toBe(false);
  });
  it("caps extreme ratings and warns when no growth forecast exists", () => {
    const v = intrinsicValuation({ ...base, price: 10, marketCap: 10e9, estimates: [] });
    if (!v.available) throw new Error(v.note);
    expect(v.rating).toBe("Strong");
    expect(v.ratingCapped).toBe(true);
  });
  it("clamps implausible consensus growth", () => {
    const v = intrinsicValuation({ ...base, estimates: [{ date: "2026-12-31", revenueAvg: 150e9 }] });
    if (!v.available) throw new Error(v.note);
    expect(v.growth).toBe(POLICY.growthBounds[1]);
  });
  it("produces three labelled intrinsic scenarios", () => {
    const s = valuationScenarios(intrinsicValuation(base), 100);
    expect(s.map(x => x.label)).toEqual(["Bull", "Base", "Bear"]);
    expect(s.every(x => x.valuationMethod?.includes("intrinsic value"))).toBe(true);
  });
  it("rating bands", () => {
    expect([35, 15, 0, -15, -40].map(ratingFor)).toEqual(["Very strong", "Strong", "Mixed", "Weak", "Very weak"]);
  });
});

describe("valuation factor is set in code", () => {
  const factor = (rating: string) => ({ rating, reason: "model view", sources: [], evidenceDate: "2026-09-30" });
  const thesis = { valuationBasis: "Unavailable", valuationBenchmark: "", growthOutlook: "", strongestCounterargument: "", timing: "", changeMind: "",
    factors: { growth: factor("Strong"), cash: factor("Strong"), valuation: factor("Unknown"), competition: factor("Mixed"), execution: factor("Mixed"), market: factor("Mixed") } } as unknown as InvestmentCase;
  const ctx = { secUrl: "https://data.sec.gov/x.json", asOf: "2026-09-30", peerComparable: false };
  it("replaces an Unknown valuation with the DCF rating and cites SEC", () => {
    const v = intrinsicValuation(base);
    const out = applyDeterministicValuation(thesis, v, ctx);
    expect(out.valuationBasis).toBe("Independent cash-flow valuation");
    expect(out.factors.valuation.rating).toBe(v.available ? v.rating : "Unknown");
    expect(out.factors.valuation.sources[0]).toBe(ctx.secUrl);
    expect(out.factors.valuation.reason).toMatch(/model critique: model view/i);
  });
  it("takes the more conservative of DCF and a complete peer comparison", () => {
    const cheap = intrinsicValuation({ ...base, price: 40, marketCap: 40e9 });
    const peers = { ...thesis, valuationBasis: "Peer comparison", factors: { ...thesis.factors, valuation: factor("Weak") } } as unknown as InvestmentCase;
    expect(applyDeterministicValuation(peers, cheap, { ...ctx, peerComparable: true }).factors.valuation.rating).toBe("Weak");
  });
  it("leaves the case unchanged when the DCF is unavailable", () => {
    expect(applyDeterministicValuation(thesis, intrinsicValuation({}), ctx)).toBe(thesis);
  });
});
