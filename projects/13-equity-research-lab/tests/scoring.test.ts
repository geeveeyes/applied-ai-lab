import { describe, expect, it } from "vitest";
import { evidenceAdjustScores, retrospectiveGrade, weightedCoverage, weightedScore } from "../lib/scoring";
import { reverseDcfFromMarketCap, selectHorizonEstimate } from "../lib/valuation";

const all80 = {
  businessQuality: 80, financialPerformance: 80, growthRunway: 80, industryMoat: 80,
  leadershipGovernance: 80, valuation: 80, analystExpectations: 80, sentimentPositioning: 80,
  technicalLiquidity: 80, catalysts: 80, riskResilience: 80, portfolioFit: 80,
};

describe("weightedScore", () => {
  it("preserves a uniform score because weights total 100", () => expect(weightedScore(all80)).toBe(80));
});

describe("evidence adjustment", () => {
  it("caps poorly evidenced dimensions", () => {
    const coverage = { ...all80, industryMoat: 20, leadershipGovernance: 15 };
    const adjusted = evidenceAdjustScores({ ...all80, industryMoat: 95, leadershipGovernance: 90 }, coverage);
    expect(adjusted.industryMoat).toBe(40);
    expect(adjusted.leadershipGovernance).toBe(35);
    expect(weightedCoverage(coverage)).toBeLessThan(80);
  });
});

describe("12-month horizon estimate", () => {
  it("uses the first fiscal period reaching the target date", () => {
    const result = selectHorizonEstimate([
      { date: "2027-01-25", epsAvg: 9.26 },
      { date: "2028-01-25", epsAvg: 15.74 },
      { date: "2029-01-25", epsAvg: 20.0 },
    ], "2026-09-25", 1);
    expect(result?.date).toBe("2028-01-25");
    expect(result?.epsAvg).toBe(15.74);
  });
});

describe("reverse DCF", () => {
  it("solves a finite implied growth rate for positive FCF", () => {
    const result = reverseDcfFromMarketCap(5_000_000_000_000, 100_000_000_000);
    expect(result.available).toBe(true);
    expect(result.impliedFcfGrowth).toBeGreaterThan(0);
    expect(result.impliedFcfGrowth).toBeLessThan(1);
  });
});

describe("retrospectiveGrade", () => {
  it("flags returns inside the frozen range", () => {
    const result = retrospectiveGrade({ low: 5, high: 20 }, 12, 8);
    expect(result.insideRange).toBe(true);
    expect(result.excessReturn).toBe(4);
    expect(result.grade).toBe("Strong");
  });
});
