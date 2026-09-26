import { describe, expect, it } from "vitest";
import { factorKeys, singleInvestmentDecision, validateInvestmentCase, type InvestmentCase } from "../lib/investment";
import { demoResearch } from "../lib/mock-data";
const source = "https://example.com/results";
function thesis(rating: "Strong" | "Weak" | "Very strong" = "Strong"): InvestmentCase {
 return { factors: Object.fromEntries(factorKeys.map(k => [k, { rating, reason: "Dated evidence", evidenceDate: "2026-09-24", sources: [source] }])) as InvestmentCase["factors"], growthOutlook: "Growing", strongestCounterargument: "Competition", timing: "Sourced opportunity", changeMind: "Cash declines" };
}
function run(t = thesis()) { return {...demoResearch("TEST"), dataMode: "live" as const, analyzedAt: "2026-09-26T12:00:00Z", marketAsOf: "2026-09-25", asOfPrice: 100, investmentCase: t}; }
describe("unified investment decision", () => {
 it("maps sourced bullish and bearish evidence to different stock actions", () => {
  expect(singleInvestmentDecision(run())).toMatchObject({score:70, action:"Buy candidate"});
  expect(singleInvestmentDecision(run(thesis("Weak")))).toMatchObject({score:30, action:"Avoid / review selling"});
 });
 it("never buys or sells based on missing valuation", () => {
  for (const rating of ["Very strong", "Weak"] as const) { const t=thesis(rating); t.factors.valuation.rating="Unknown";
   const result=singleInvestmentDecision(run(t)); expect(result.score).toBeGreaterThanOrEqual(40);expect(result.score).toBeLessThanOrEqual(59);
  }
 });
 it("withholds a number if core financial evidence is missing", () => { const t=thesis();t.factors.cash.rating="Unknown";expect(singleInvestmentDecision(run(t)).score).toBeNull(); });
 it("withholds a number for stale, future or absent prices", () => { for(const date of ["2026-08-01","2026-10-01",undefined]) expect(singleInvestmentDecision({...run(),marketAsOf:date}).score).toBeNull(); });
 it("rejects unsupported citations and stale factor evidence without fabricating a bearish view", () => {
  const t=thesis();t.factors.growth.sources=["https://fabricated.example/result"];t.factors.market.evidenceDate="2025-01-01";
  const checked=validateInvestmentCase(t,[source],run().analyzedAt);expect(checked.factors.growth.rating).toBe("Unknown");expect(checked.factors.market.rating).toBe("Unknown");expect(singleInvestmentDecision(run(checked)).score).toBeNull();
 });
 it("does not mutate model output or admit future dated evidence", () => {const t=thesis();t.factors.cash.evidenceDate="2027-01-01";expect(validateInvestmentCase(t,[source],run().analyzedAt).factors.cash.rating).toBe("Unknown");expect(t.factors.cash.rating).toBe("Strong");});
 it("does not multiply business score by an unrelated confidence percentage", () => {expect(singleInvestmentDecision({...run(),score:5,confidence:2}).score).toBe(70);});
});
