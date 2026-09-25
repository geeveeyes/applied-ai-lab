import type { DimensionCoverage, ResearchScores, ScoreKey } from "./types";

export const SCORE_WEIGHTS: Record<ScoreKey, number> = {
  businessQuality: 10,
  financialPerformance: 15,
  growthRunway: 8,
  industryMoat: 10,
  leadershipGovernance: 8,
  valuation: 15,
  analystExpectations: 8,
  sentimentPositioning: 7,
  technicalLiquidity: 4,
  catalysts: 5,
  riskResilience: 5,
  portfolioFit: 5,
};

export function weightedScore(scores: ResearchScores): number {
  const total = (Object.keys(SCORE_WEIGHTS) as ScoreKey[]).reduce(
    (sum, key) => sum + (scores[key] / 100) * SCORE_WEIGHTS[key],
    0,
  );
  return Math.round(total);
}

export function weightedCoverage(coverage: DimensionCoverage): number {
  const total = (Object.keys(SCORE_WEIGHTS) as ScoreKey[]).reduce(
    (sum, key) => sum + (coverage[key] / 100) * SCORE_WEIGHTS[key],
    0,
  );
  return Math.round(total);
}

export function evidenceAdjustScores(
  raw: ResearchScores,
  coverage: DimensionCoverage,
): ResearchScores {
  return Object.fromEntries(
    (Object.keys(raw) as ScoreKey[]).map((key) => {
      // The model may reason from supplied evidence, but weakly-covered dimensions
      // cannot receive near-certain scores simply from pretrained knowledge.
      const cap = Math.min(100, coverage[key] + 20);
      return [key, Math.round(Math.min(raw[key], cap))];
    }),
  ) as ResearchScores;
}

export function verdictFor(score: number, confidence: number) {
  if (confidence < 50) return "Insufficient data" as const;
  if (score >= 75) return "Buy candidate" as const;
  if (score >= 55) return "Watch" as const;
  return "Avoid for now" as const;
}

export function retrospectiveGrade(
  predicted: { low: number; high: number },
  actual: number,
  benchmark: number,
) {
  const insideRange = actual >= predicted.low && actual <= predicted.high;
  const midpoint = (predicted.low + predicted.high) / 2;
  const directionCorrect = Math.sign(midpoint) === Math.sign(actual) || actual === 0;
  const excessReturn = actual - benchmark;
  const error = Math.abs(actual - midpoint);

  return {
    insideRange,
    directionCorrect,
    excessReturn: Number(excessReturn.toFixed(2)),
    absoluteError: Number(error.toFixed(2)),
    grade: insideRange ? "Strong" : directionCorrect && error <= 10 ? "Good" : directionCorrect ? "Mixed" : "Miss",
  } as const;
}
