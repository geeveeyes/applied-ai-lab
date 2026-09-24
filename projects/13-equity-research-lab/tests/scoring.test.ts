import { describe, expect, it } from "vitest";
import { retrospectiveGrade, weightedScore } from "../lib/scoring";

const all80 = {
  businessQuality: 80, financialPerformance: 80, growthRunway: 80, industryMoat: 80,
  leadershipGovernance: 80, valuation: 80, analystExpectations: 80, sentimentPositioning: 80,
  technicalLiquidity: 80, catalysts: 80, riskResilience: 80, portfolioFit: 80,
};

describe("weightedScore", () => {
  it("preserves a uniform score because weights total 100", () => expect(weightedScore(all80)).toBe(80));
});

describe("retrospectiveGrade", () => {
  it("flags returns inside the frozen range", () => {
    const result = retrospectiveGrade({ low: 5, high: 20 }, 12, 8);
    expect(result.insideRange).toBe(true);
    expect(result.excessReturn).toBe(4);
    expect(result.grade).toBe("Strong");
  });
});
