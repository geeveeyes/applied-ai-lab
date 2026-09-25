import { demoResearch } from "./mock-data";
import { providers } from "./providers";
import { verdictFor, weightedScore } from "./scoring";
import type { AnalystCall, Citation, ResearchRun, ResearchScores } from "./types";

const EMPTY_SCORES: ResearchScores = {
  businessQuality: 0,
  financialPerformance: 0,
  growthRunway: 0,
  industryMoat: 0,
  leadershipGovernance: 0,
  valuation: 0,
  analystExpectations: 0,
  sentimentPositioning: 0,
  technicalLiquidity: 0,
  catalysts: 0,
  riskResilience: 0,
  portfolioFit: 0,
};

function liveShell(ticker: string): ResearchRun {
  return {
    id: `${ticker}-${Date.now()}`,
    ticker,
    companyName: ticker,
    analyzedAt: new Date().toISOString(),
    asOfPrice: 0,
    dataMode: "hybrid",
    skillVersion: "equity-research-v0.2.0",
    score: 0,
    confidence: 0,
    verdict: "Insufficient data",
    scores: { ...EMPTY_SCORES },
    highlights: [],
    risks: [],
    catalysts: [],
    managementCredibility: [],
    expectationGap: "Awaiting sufficient live evidence.",
    valuationSummary: "No valuation conclusion yet.",
    analystSummary: "No analyst evidence loaded yet.",
    analysts: [],
    scenarios: [],
    thesisKillers: [],
    optionIdeas: [],
    benchmark: "SPY",
    expectedReturn12m: { low: 0, high: 0 },
    citations: [],
    notes: [],
  };
}

export async function runResearch(tickerRaw: string): Promise<ResearchRun> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(ticker)) throw new Error("Invalid ticker symbol");

  if (process.env.NEXT_PUBLIC_APP_MODE !== "live") return demoResearch(ticker);

  const run = liveShell(ticker);
  const errors: string[] = [];
  const citations: Citation[] = [];
  let liveComponents = 0;
  let fundamentals: unknown = null;
  let market: Awaited<ReturnType<typeof providers.market.getMarket>> | null = null;
  let analystData: Awaited<ReturnType<typeof providers.analysts.getAnalysts>> | null = null;

  const [secResult, marketResult, analystResult] = await Promise.allSettled([
    providers.sec.getFundamentals(ticker),
    providers.market.getMarket(ticker),
    providers.analysts.getAnalysts(ticker),
  ]);

  if (secResult.status === "fulfilled") {
    fundamentals = secResult.value;
    run.companyName = secResult.value.companyName ?? run.companyName;
    citations.push(...secResult.value.citations);
    liveComponents += 1;
  } else {
    errors.push(secResult.reason instanceof Error ? secResult.reason.message : "SEC provider failed");
  }

  if (marketResult.status === "fulfilled") {
    market = marketResult.value;
    run.companyName = market.companyName ?? run.companyName;
    run.asOfPrice = market.price ?? 0;
    citations.push(...market.citations);
    liveComponents += 1;
  } else {
    errors.push(marketResult.reason instanceof Error ? marketResult.reason.message : "FMP market provider failed");
  }

  if (analystResult.status === "fulfilled") {
    analystData = analystResult.value;
    citations.push(...analystData.citations);
    if (
      analystData.estimates.length ||
      analystData.consensusTarget ||
      analystData.ratings
    ) liveComponents += 1;
    errors.push(...analystData.unavailable);
  } else {
    errors.push(analystResult.reason instanceof Error ? analystResult.reason.message : "FMP analyst provider failed");
  }

  run.citations = citations;
  run.dataMode = liveComponents >= 3 ? "live" : "hybrid";

  if (!market?.price) {
    run.notes = [
      "Live research stopped before AI synthesis because no verified current price was available.",
      ...errors.map((x) => `Provider note: ${x}`),
    ];
    return run;
  }

  const evidence = {
    ticker,
    companyName: run.companyName,
    analysisTimestamp: run.analyzedAt,
    currentMarket: market,
    secFundamentals: fundamentals,
    analystConsensus: analystData ? {
      consensusTarget: analystData.consensusTarget,
      targetHigh: analystData.targetHigh,
      targetLow: analystData.targetLow,
      targetMedian: analystData.targetMedian,
      estimates: analystData.estimates,
      ratings: analystData.ratings,
      unavailable: analystData.unavailable,
    } : null,
    sourcePolicy: "SEC facts are primary-source evidence. FMP quote/consensus/estimates are professional-data evidence. Missing fields must not be inferred.",
    scoreWeights: {
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
    },
  };

  try {
    const ai = await providers.ai.synthesize(evidence);
    run.confidence = Math.round(ai.confidence);
    run.scores = ai.scores;
    run.score = weightedScore(ai.scores);
    run.verdict = verdictFor(run.score, run.confidence);
    run.highlights = ai.highlights;
    run.risks = ai.risks;
    run.catalysts = ai.catalysts;
    run.managementCredibility = ai.managementCredibility;
    run.expectationGap = ai.expectationGap;
    run.valuationSummary = ai.valuationSummary;
    run.analystSummary = ai.analystSummary;
    run.scenarios = ai.scenarios;
    run.thesisKillers = ai.thesisKillers;
    run.optionIdeas = ai.optionIdeas;
    run.expectedReturn12m = ai.expectedReturn12m;
    run.benchmark = ai.benchmark || "SPY";
    run.analysts = (analystData?.calls ?? []) as AnalystCall[];
    run.notes = [
      "AI synthesis used only the live evidence packet shown in Sources. Missing analyst-level TipRanks data was not backfilled with demo values.",
      ...errors.map((x) => `Provider note: ${x}`),
    ];
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "OpenAI synthesis failed");
    run.notes = [
      "Live evidence loaded, but the AI synthesis failed. No demo score or verdict was substituted.",
      ...errors.map((x) => `Provider note: ${x}`),
    ];
  }

  return run;
}
