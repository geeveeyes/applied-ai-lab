import type { DimensionCoverage, ResearchScores } from "@/lib/types";
import { SCORE_WEIGHTS } from "@/lib/scoring";

const labels: Record<keyof ResearchScores, string> = {
  businessQuality: "Business quality",
  financialPerformance: "Financial performance",
  growthRunway: "Growth runway",
  industryMoat: "Industry & moat",
  leadershipGovernance: "Leadership & governance",
  valuation: "Valuation",
  analystExpectations: "Analyst expectations",
  sentimentPositioning: "Sentiment & positioning",
  technicalLiquidity: "Technical & liquidity",
  catalysts: "Catalysts",
  riskResilience: "Risk resilience",
  portfolioFit: "Portfolio fit",
};

export function ScoreGrid({ scores, coverage }: { scores: ResearchScores; coverage?: DimensionCoverage }) {
  return <div className="score-grid">{(Object.keys(scores) as (keyof ResearchScores)[]).map((key) => (
    <div className="score-card" key={key}>
      <div><strong>{labels[key]}</strong><span>{SCORE_WEIGHTS[key]}%</span></div>
      <div className="meter"><i style={{ width: `${scores[key]}%` }} /></div>
      <b>{scores[key]}</b>
      {coverage ? <small className="muted">Evidence coverage {coverage[key]}%</small> : null}
    </div>
  ))}</div>;
}
