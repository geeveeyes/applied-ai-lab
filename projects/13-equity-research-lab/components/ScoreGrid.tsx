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

export function ScoreGrid({ scores, coverage, reasons }: { scores: ResearchScores; coverage?: DimensionCoverage; reasons?: Partial<Record<keyof ResearchScores, string>> }) {
  return <div className="score-grid">{(Object.keys(scores) as (keyof ResearchScores)[]).map((key) => (
    <div className="score-card" key={key}>
      <div><strong>{labels[key]}</strong><span>{SCORE_WEIGHTS[key]}%</span></div>
      <div className="meter"><i style={{ width: `${scores[key]}%` }} /></div>
      <b>{scores[key]}</b>
      {reasons?.[key] && <p className="muted">{reasons[key]}</p>}
      {coverage ? <small className="muted">Evidence coverage {coverage[key]}%</small> : null}
    </div>
  ))}</div>;
}
