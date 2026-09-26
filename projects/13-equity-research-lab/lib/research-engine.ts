import { ageDays, deterministicConfidence } from "./confidence";
import { demoResearch } from "./mock-data";
import { providers } from "./providers";
import { evidenceAdjustScores, verdictFor, weightedCoverage, weightedScore } from "./scoring";
import { addYearsIso, calibratedScenarios, reverseDcfFromMarketCap, selectHorizonEstimate } from "./valuation";
import type { AnalystCall, Citation, DimensionCoverage, ResearchRun, ResearchScores } from "./types";

const EMPTY_SCORES: ResearchScores = {
  businessQuality: 0, financialPerformance: 0, growthRunway: 0, industryMoat: 0,
  leadershipGovernance: 0, valuation: 0, analystExpectations: 0, sentimentPositioning: 0,
  technicalLiquidity: 0, catalysts: 0, riskResilience: 0, portfolioFit: 0,
};

function liveShell(ticker: string): ResearchRun {
  return {
    id: crypto.randomUUID(), ticker, companyName: ticker, analyzedAt: new Date().toISOString(),
    asOfPrice: 0, dataMode: "hybrid", skillVersion: "equity-research-v0.7.0",
    score: 0, confidence: 0, verdict: "Insufficient data", scores: { ...EMPTY_SCORES },
    highlights: [], risks: [], catalysts: [], managementCredibility: [],
    expectationGap: "Awaiting sufficient live evidence.", valuationSummary: "No valuation conclusion yet.",
    analystSummary: "No analyst evidence loaded yet.", analysts: [], scenarios: [], thesisKillers: [],
    optionIdeas: [], benchmark: "SPY", expectedReturn12m: { low: 0, high: 0 }, citations: [], notes: [],
  };
}

function dimensionCoverage(args: {
  hasAnnual: boolean;
  hasQuarter: boolean;
  hasFcf: boolean;
  hasEstimates: boolean;
  hasMultipleEstimates: boolean;
  hasTargets: boolean;
  hasTechnicals: boolean;
  hasLatest10Q: boolean;
  hasHorizonEps: boolean;
}): DimensionCoverage {
  return {
    businessQuality: args.hasQuarter && args.hasAnnual ? 55 : args.hasAnnual ? 40 : 20,
    financialPerformance: args.hasQuarter && args.hasAnnual ? 95 : args.hasAnnual ? 75 : 25,
    growthRunway: args.hasMultipleEstimates ? 80 : args.hasEstimates ? 60 : 20,
    industryMoat: 20,
    leadershipGovernance: 15,
    valuation: args.hasFcf && args.hasHorizonEps ? 90 : args.hasHorizonEps ? 75 : 35,
    analystExpectations: args.hasEstimates && args.hasTargets ? 85 : args.hasEstimates ? 65 : 25,
    sentimentPositioning: args.hasTargets ? 55 : 30,
    technicalLiquidity: args.hasTechnicals ? 70 : 45,
    catalysts: args.hasQuarter && args.hasEstimates ? 40 : 25,
    riskResilience: args.hasLatest10Q ? 45 : args.hasAnnual ? 30 : 20,
    portfolioFit: 20,
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
  } else errors.push(secResult.reason instanceof Error ? secResult.reason.message : "SEC provider failed");

  if (marketResult.status === "fulfilled") {
    market = marketResult.value;
    run.companyName = market.companyName ?? run.companyName;
    run.asOfPrice = market.price ?? 0;
    run.marketAsOf = market.timestamp;
    run.priceTiming = market.priceTiming;
    run.priceSource = market.source;
    errors.push(...(market.notes ?? []));
    citations.push(...market.citations);
    liveComponents += 1;
  } else errors.push(marketResult.reason instanceof Error ? marketResult.reason.message : "FMP market provider failed");

  if (analystResult.status === "fulfilled") {
    analystData = analystResult.value;
    citations.push(...analystData.citations);
    errors.push(...analystData.unavailable);
    if (analystData.estimates.length || analystData.consensusTarget) liveComponents += 1;
  } else errors.push(analystResult.reason instanceof Error ? analystResult.reason.message : "FMP analyst provider failed");

  if (fundamentals?.latestAnnualPeriodEnd) {
    run.annualFinancials = {
      periodEnd: fundamentals.latestAnnualPeriodEnd, form: fundamentals.latestAnnualForm,
      filedAt: fundamentals.latestAnnualFiledAt, revenue: fundamentals.revenue,
      netIncome: fundamentals.netIncome, operatingCashFlow: fundamentals.operatingCashFlow,
      capitalExpenditures: fundamentals.capitalExpenditures, freeCashFlow: fundamentals.freeCashFlow,
    };
  }
  run.citations = citations;
  run.dataMode = liveComponents >= 3 ? "live" : "hybrid";
  if (!market?.price || !Number.isFinite(market.price) || market.price <= 0) {
    run.expectationGap = "Price-based expectations analysis is unavailable because the market-data provider did not supply a verified quote.";
    run.valuationSummary = "Valuation and return scenarios are withheld until a verified market price and suitable forecasts are available.";
    run.notes = ["Live research stopped before AI synthesis because no verified current price was available.",
      run.annualFinancials ? `Verified annual ${run.annualFinancials.form ?? "filing"} figures for ${run.annualFinancials.periodEnd} are shown separately; these do not establish a current investment verdict.` : "No supported annual financial facts were extracted; a source link alone does not establish financial coverage.",
      "For HTTP 402, check the configured FMP account's endpoint and symbol entitlements. The application cannot determine the exact subscription from the HTTP status alone.",
      ...errors.map((x) => `Provider note: ${x}`)];
    return run;
  }

  const latestActualPeriod = fundamentals?.latestAnnualPeriodEnd;
  const analysisDate = run.analyzedAt.slice(0, 10);
  const targetDate12m = addYearsIso(analysisDate, 1);
  const forwardEstimates = (analystData?.estimates ?? [])
    .filter((x) => x.date)
    .filter((x) => !latestActualPeriod || String(x.date) > latestActualPeriod)
    .filter((x) => String(x.date) > analysisDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 6);

  const horizonEstimate = selectHorizonEstimate(forwardEstimates, analysisDate, 1);
  const reverseDcf = reverseDcfFromMarketCap(market.marketCap, fundamentals?.freeCashFlow);
  run.reverseDcf = reverseDcf;

  const hasAnnual = Boolean(fundamentals?.revenue != null && ageDays(run.analyzedAt, fundamentals?.latestAnnualPeriodEnd) <= 460);
  const hasQuarter = Boolean(fundamentals?.latestQuarterRevenue != null && ageDays(run.analyzedAt, fundamentals?.latestQuarterPeriodEnd) <= 190);
  const coverage = dimensionCoverage({
    hasAnnual,
    hasQuarter,
    hasFcf: Boolean(hasAnnual && fundamentals?.freeCashFlow != null),
    hasEstimates: forwardEstimates.length > 0,
    hasMultipleEstimates: forwardEstimates.length >= 2,
    hasTargets: Boolean(analystData?.consensusTarget),
    hasTechnicals: Boolean(market.priceAvg50 && market.priceAvg200),
    hasLatest10Q: Boolean(hasQuarter && fundamentals?.latestQuarterFormUrl),
    hasHorizonEps: Boolean(horizonEstimate?.epsAvg),
  });
  run.dimensionCoverage = coverage;
  const evidenceCoverage = weightedCoverage(coverage);

  const confidence = deterministicConfidence({ coverage, asOf: run.analyzedAt, marketAsOf: market.timestamp,
    annualEnd: hasAnnual ? fundamentals?.latestAnnualPeriodEnd : undefined,
    quarterEnd: hasQuarter ? fundamentals?.latestQuarterPeriodEnd : undefined, estimate: horizonEstimate, citations });
  const scenarios = calibratedScenarios(market.price, horizonEstimate, targetDate12m);
  const evidence = {
    calibratedScenarios: scenarios,
    scenarioPolicy: "Price-anchored sensitivity only. Base is neutral by construction, not intrinsic value or expected appreciation. Multiples and weights are policy stresses; never describe them as justified fair value or empirical probabilities.",
    ticker,
    companyName: run.companyName,
    analysisTimestampUtc: run.analyzedAt,
    valuationTargetDate12m: targetDate12m,
    currentMarket: market,
    latestReportedAnnual: fundamentals ? {
      periodEnd: fundamentals.latestAnnualPeriodEnd,
      filedAt: fundamentals.latestAnnualFiledAt,
      revenue: fundamentals.revenue,
      netIncome: fundamentals.netIncome,
      operatingCashFlow: fundamentals.operatingCashFlow,
      capitalExpenditures: fundamentals.capitalExpenditures,
      freeCashFlow: fundamentals.freeCashFlow,
    } : null,
    latestReportedQuarter: fundamentals ? {
      periodEnd: fundamentals.latestQuarterPeriodEnd,
      filedAt: fundamentals.latestQuarterFiledAt,
      revenue: fundamentals.latestQuarterRevenue,
      netIncome: fundamentals.latestQuarterNetIncome,
      grossProfit: fundamentals.latestQuarterGrossProfit,
      grossMargin: fundamentals.latestQuarterGrossMargin,
      filingUrl: fundamentals.latestQuarterFormUrl,
    } : null,
    forwardAnalystEstimates: forwardEstimates,
    valuationHorizonEstimate: horizonEstimate ?? null,
    analystConsensus: analystData ? {
      consensusTarget: analystData.consensusTarget,
      targetHigh: analystData.targetHigh,
      targetLow: analystData.targetLow,
      targetMedian: analystData.targetMedian,
      unavailable: analystData.unavailable,
    } : null,
    reverseDcf,
    dimensionEvidenceCoverage: coverage,
    weightedEvidenceCoverage: evidenceCoverage,
    sourcePolicy: "SEC facts and filings are primary-source evidence. FMP quote/consensus/estimates are market-data evidence. Missing qualitative evidence must not be filled from model memory.",
  };

  try {
    const ai = await providers.ai.synthesize(evidence);
    const adjustedScores = evidenceAdjustScores(ai.scores, coverage);
    run.scores = adjustedScores;
    run.scoreReasons = ai.scoreReasons;
    run.score = weightedScore(adjustedScores);
    run.confidence = confidence.score;
    run.verdict = verdictFor(run.score, run.confidence);
    if (run.verdict === "Buy candidate") run.verdict = "Watch"; // No independent fair-value evidence yet.
    run.executiveSummary = ai.executiveSummary;
    run.highlights = ai.highlights;
    run.risks = ai.risks;
    run.catalysts = ai.catalysts;
    run.managementCredibility = ai.managementCredibility;
    run.expectationGap = ai.expectationGap;
    run.valuationSummary = ai.valuationSummary;
    run.analystSummary = ai.analystSummary;
    run.thesisKillers = ai.thesisKillers;
    run.optionIdeas = []; // No live options chain; do not assign unsupported strategy fit.
    run.benchmark = "SPY";
    run.analysts = (analystData?.calls ?? []) as AnalystCall[];

    run.scenarios = scenarios;

    if (run.scenarios.length) {
      const returns = run.scenarios.map((s) => (s.fairValue / run.asOfPrice - 1) * 100);
      run.expectedReturn12m = {
        low: Number(Math.min(...returns).toFixed(1)),
        high: Number(Math.max(...returns).toFixed(1)),
      };
    } else {
      run.notes.push("12-month scenario fair values were withheld because no usable horizon EPS estimate was available.");
    }

    run.notes = [
      confidence.note,
      "Scenario values are sensitivities, not independent fair values; Buy candidate is withheld until independent valuation evidence exists.",
      "Ratings map to 10/30/50/70/90; insufficient evidence maps to neutral 50. Evidence adjustment: 50 + (raw score − 50) × coverage / 100. Missing evidence lowers confidence instead of implying a bad company.",
      latestActualPeriod ? `Latest annual period: ${latestActualPeriod}; latest reported interim quarter (10-Q): ${fundamentals?.latestQuarterPeriodEnd ?? "unavailable"}.` : "Latest annual period unavailable.",
      `12-month valuation target date: ${targetDate12m}; selected fiscal EPS period: ${horizonEstimate?.date ?? "unavailable"}.`,
      "Sell-side price targets remain sentiment evidence only.",
      ...run.notes,
      ...errors.map((x) => `Data coverage note: ${x}`),
    ];
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "OpenAI synthesis failed");
    run.notes = ["Live evidence loaded, but the AI synthesis failed. No demo score or verdict was substituted.", ...errors.map((x) => `Provider note: ${x}`)];
  }

  return run;
}
