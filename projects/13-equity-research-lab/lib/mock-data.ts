import type { ResearchRun, ResearchScores } from "./types";
import { weightedScore, verdictFor } from "./scoring";

function scoresFor(ticker: string): ResearchScores {
  const presets: Record<string, ResearchScores> = {
    NVDA: { businessQuality: 94, financialPerformance: 96, growthRunway: 92, industryMoat: 94, leadershipGovernance: 88, valuation: 53, analystExpectations: 82, sentimentPositioning: 74, technicalLiquidity: 89, catalysts: 88, riskResilience: 72, portfolioFit: 58 },
    MSFT: { businessQuality: 95, financialPerformance: 91, growthRunway: 86, industryMoat: 95, leadershipGovernance: 92, valuation: 61, analystExpectations: 78, sentimentPositioning: 77, technicalLiquidity: 90, catalysts: 82, riskResilience: 88, portfolioFit: 77 },
    AMZN: { businessQuality: 92, financialPerformance: 86, growthRunway: 88, industryMoat: 94, leadershipGovernance: 86, valuation: 68, analystExpectations: 83, sentimentPositioning: 76, technicalLiquidity: 91, catalysts: 84, riskResilience: 82, portfolioFit: 48 },
  };
  return presets[ticker] ?? { businessQuality: 72, financialPerformance: 68, growthRunway: 70, industryMoat: 66, leadershipGovernance: 67, valuation: 64, analystExpectations: 61, sentimentPositioning: 58, technicalLiquidity: 70, catalysts: 62, riskResilience: 65, portfolioFit: 70 };
}

export function demoResearch(tickerRaw: string): ResearchRun {
  const ticker = tickerRaw.toUpperCase();
  const scores = scoresFor(ticker);
  const score = weightedScore(scores);
  const confidence = ticker in { NVDA: 1, MSFT: 1, AMZN: 1 } ? 78 : 55;
  const price = ticker === "NVDA" ? 180 : ticker === "MSFT" ? 520 : ticker === "AMZN" ? 225 : 100;
  return {
    id: `${ticker}-${Date.now()}`,
    ticker,
    companyName: ticker === "NVDA" ? "NVIDIA Corporation" : ticker === "MSFT" ? "Microsoft Corporation" : ticker === "AMZN" ? "Amazon.com, Inc." : `${ticker} (demo company)`,
    analyzedAt: new Date().toISOString(),
    asOfPrice: price,
    dataMode: "demo",
    skillVersion: "equity-research-v0.1.0",
    score,
    confidence,
    verdict: verdictFor(score, confidence),
    scores,
    highlights: ["Separates business quality from valuation and timing.", "Uses expectation-gap thinking rather than headline growth alone.", "Demo values are placeholders until live providers are configured."],
    risks: ["Valuation compression", "Execution miss versus embedded expectations", "Macro or industry-cycle reversal"],
    catalysts: ["Next earnings report", "Estimate revisions", "Product / capacity milestones"],
    managementCredibility: ["Track promises against subsequent delivery.", "Weight capital allocation and incentive alignment.", "Flag executive turnover and material insider transactions."],
    expectationGap: "Demo: market expectations appear demanding; live mode should compare consensus growth/margins with reverse-DCF-implied assumptions.",
    valuationSummary: "Demo valuation only. Live mode combines relative multiples, FCF yield, scenario valuation and reverse DCF.",
    analystSummary: "Demo analyst feed. Live mode uses FMP/TipRanks records, source links, revision direction and analyst-specific track records.",
    analysts: [
      { analyst: "Demo Analyst A", firm: "Research Firm", rating: "Buy", priceTarget: price * 1.15, successRate: 68, averageReturn: 9.4 },
      { analyst: "Demo Analyst B", firm: "Research Firm", rating: "Hold", priceTarget: price * 1.03, successRate: 61, averageReturn: 5.2 },
    ],
    scenarios: [
      { label: "Bull", probability: 25, fairValue: price * 1.3, thesis: ["Growth exceeds consensus", "Margins expand faster than expected"] },
      { label: "Base", probability: 50, fairValue: price * 1.12, thesis: ["Execution roughly matches consensus", "Valuation remains near current band"] },
      { label: "Bear", probability: 25, fairValue: price * 0.72, thesis: ["Estimate cuts", "Multiple compression"] },
    ],
    thesisKillers: ["Two consecutive quarters of material negative estimate revisions", "Structural gross-margin deterioration", "Loss of a core competitive advantage"],
    optionIdeas: [
      { strategy: "Shares", fit: "Strong", rationale: "No expiry or theta; preferred baseline for a long-duration thesis.", maxLoss: "Capital invested", capitalProfile: "High", volatilityView: "Neutral" },
      { strategy: "LEAPS call", fit: "Moderate", rationale: "Capital efficient but sensitive to IV, time decay and strike selection.", maxLoss: "Premium paid", capitalProfile: "Medium", volatilityView: "Prefer normal/low IV" },
      { strategy: "Bull call spread", fit: "Moderate", rationale: "Caps cost and vega exposure at the expense of capped upside.", maxLoss: "Net debit", capitalProfile: "Low/Medium", volatilityView: "Works when outright calls are expensive" },
      { strategy: "Do nothing", fit: "Strong", rationale: "Valid when valuation or event risk leaves insufficient margin of safety.", maxLoss: "$0", capitalProfile: "None", volatilityView: "Any" },
    ],
    benchmark: "SPY",
    expectedReturn12m: { low: -5, high: 18 },
    citations: [
      { title: "SEC EDGAR APIs", url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces", source: "SEC", retrievedAt: new Date().toISOString(), tier: 1 },
      { title: "FMP Analyst Estimates", url: "https://site.financialmodelingprep.com/developer/docs/stable/financial-estimates", source: "FMP", retrievedAt: new Date().toISOString(), tier: 3 },
    ],
    notes: ["DEMO MODE: do not use these placeholder values for an investment decision."],
  };
}
