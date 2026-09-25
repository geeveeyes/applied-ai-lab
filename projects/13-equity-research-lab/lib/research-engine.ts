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
    skillVersion: "equity-research-v0.3.1",
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

function coverageScore(args: {
  market: boolean;
  secAnnual: boolean;
  estimates: boolean;
  targets: boolean;
  ratings: boolean;
}) {
  return (
    (args.market ? 20 : 0) +
    (args.secAnnual ? 30 : 0) +
    (args.estimates ? 25 : 0) +
    (args.targets ? 15 : 0) +
    (args.ratings ? 10 : 0)
  );
}

export async function runResearch(tickerRaw: string): Promise<ResearchRun> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(ticker)) throw new Error("Invalid ticker symbol");

  if (process.env.NEXT_PUBLIC_APP_MODE !== "live") return demoResearch(ticker);

  const run = liveShell(ticker);
  const errors: string[] = [];
  const citations: Citation[] = [];
  let liveComponents = 0;
  let fundamentals: Awaited<ReturnType<typeof providers.sec.getFundamentals>> | null = null;
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
    run.marketAsOf = market.timestamp;
    citations.push(...market.citations);
    liveComponents += 1;
  } else {
    errors.push(marketResult.reason instanceof Error ? marketResult.reason.message : "FMP market provider failed");
  }

  if (analystResult.status === "fulfilled") {
    analystData = analystResult.value;
    citations.push(...analystData.citations);
    errors.push(...analystData.unavailable);
    if (analystData.estimates.length || analystData.consensusTarget) liveComponents += 1;
  } else {
    errors.push(analystResult.reason instanceof Error ? analystResult.reason.message : "FMP analyst provider failed");
  }

  run.citations = citations;
  run.dataMode = liveComponents >= 3 ? "live" : "hybrid";

  if (!market?.price) {
    run.notes = ["Live research stopped before AI synthesis because no verified current price was available.", ...errors.map((x) => `Provider note: ${x}`)];
    return run;
  }

  const latestActualPeriod = fundamentals?.latestAnnualPeriodEnd;
  const analysisDate = run.analyzedAt.slice(0, 10);

  // FMP estimate dates are fiscal period-end dates. Historical rows can be
  // returned together with future rows. Keep only periods that are both:
  // 1) later than the latest reported annual actual, and
  // 2) later than today's analysis date.
  //
  // Rule (2) prevents already-ended fiscal periods from being used as a
  // "nearest-forward" valuation input if reporting has lagged or the actual
  // period anchor is incomplete.
  const forwardEstimates = (analystData?.estimates ?? [])
    .filter((x) => x.date)
    .filter((x) => !latestActualPeriod || String(x.date) > latestActualPeriod)
    .filter((x) => String(x.date) > analysisDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 4);

  const nearestForward = forwardEstimates.find((x) => x.epsAvg || x.revenueAvg);
  const hasSecAnnual = Boolean(
    fundamentals?.latestAnnualPeriodEnd &&
    (fundamentals?.revenue || fundamentals?.netIncome || fundamentals?.operatingCashFlow)
  );
  const coverage = coverageScore({
    market: Boolean(market.price),
    secAnnual: hasSecAnnual,
    estimates: forwardEstimates.length > 0,
    targets: Boolean(analystData?.consensusTarget),
    ratings: Boolean(analystData?.ratings),
  });

  const evidence = {
    ticker,
    companyName: run.companyName,
    analysisTimestampUtc: run.analyzedAt,
    currentMarket: market,
    latestReportedAnnual: fundamentals,
    forwardAnalystEstimates: forwardEstimates,
    nearestForwardEstimate: nearestForward ?? null,
    analystConsensus: analystData ? {
      consensusTarget: analystData.consensusTarget,
      targetHigh: analystData.targetHigh,
      targetLow: analystData.targetLow,
      targetMedian: analystData.targetMedian,
      ratings: analystData.ratings,
      unavailable: analystData.unavailable,
    } : null,
    evidenceCoverageScore: coverage,
    sourcePolicy: "SEC facts are primary-source evidence. FMP quote/consensus/estimates are professional-data evidence. Estimate dates are fiscal period-end dates. Only future estimate periods relative to the analysis date are supplied to the AI.",
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
    const finalConfidence = Math.round(coverage * 0.75 + ai.analysisConfidence * 0.25);
    run.confidence = Math.max(0, Math.min(100, finalConfidence));
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
    run.thesisKillers = ai.thesisKillers;
    run.optionIdeas = ai.optionIdeas;
    run.expectedReturn12m = ai.expectedReturn12m;
    run.benchmark = ai.benchmark || "SPY";
    run.analysts = (analystData?.calls ?? []) as AnalystCall[];

    const baseEps = nearestForward?.epsAvg;
    run.scenarios = baseEps ? ai.scenarios.map((s) => ({
      label: s.label,
      probability: s.probability,
      fairValue: Number((baseEps * s.epsFactor * s.peMultiple).toFixed(2)),
      thesis: s.thesis,
      valuationMethod: "Nearest-forward EPS × scenario EPS factor × scenario P/E",
      assumptions: [
        `Nearest-forward EPS: $${baseEps.toFixed(2)} for fiscal period ending ${nearestForward?.date}`,
        `EPS factor: ${s.epsFactor.toFixed(2)}×`,
        `P/E multiple: ${s.peMultiple.toFixed(1)}×`,
      ],
    })) : [];

    if (!baseEps) {
      run.notes.push("Scenario fair values were withheld because no usable future EPS estimate was available.");
    }

    run.notes = [
      `Evidence coverage score: ${coverage}/100. Final confidence blends 75% deterministic data coverage with 25% model interpretation confidence.`,
      latestActualPeriod ? `Latest reported annual period end: ${latestActualPeriod}. Only estimate periods after both this date and the analysis date were used as forward estimates.` : "Latest reported annual period end unavailable.",
      "Sell-side price targets are treated as sentiment evidence only and are not used as scenario fair values.",
      ...run.notes,
      ...errors.map((x) => `Data coverage note: ${x}`),
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
