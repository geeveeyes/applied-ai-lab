import { describe, expect, it, vi, afterEach } from "vitest";
import { calibratedScenarios, reverseDcfFromMarketCap, selectHorizonEstimate } from "../lib/valuation";
import { deterministicConfidence } from "../lib/confidence";
import { SecProvider } from "../lib/providers/sec";

const coverage = { businessQuality: 55, financialPerformance: 95, growthRunway: 80, industryMoat: 20,
  leadershipGovernance: 15, valuation: 90, analystExpectations: 85, sentimentPositioning: 55,
  technicalLiquidity: 70, catalysts: 40, riskResilience: 45, portfolioFit: 20 };
const confidenceInput = { coverage, asOf: "2026-09-25", marketAsOf: "2026-09-24",
  annualEnd: "2026-01-25", quarterEnd: "2026-07-26",
  estimate: { epsAvg: 15.74, epsLow: 12.62, epsHigh: 17.49, numAnalystsEps: 33 },
  citations: [{ title: "SEC", url: "https://sec.gov/facts", source: "SEC", retrievedAt: "2026-09-25", tier: 1 as const }] };

describe("deterministic calibration", () => {
  it.each([224.58, 1, 5000])("spans downside and upside with a neutral base at %s", price => {
    const [bull, base, bear] = calibratedScenarios(price, { ...confidenceInput.estimate, date: "2028-01-25" }, "2027-09-25");
    expect(bull.fairValue).toBeGreaterThan(price);
    expect(base.fairValue).toBe(price);
    expect(bear.fairValue).toBeLessThan(price);
    expect(bull.probability + base.probability + bear.probability).toBe(100);
    expect(bear.returnPct).toBeLessThan(0);
    expect(bear.assumptions!.join(" ")).toContain("not calibrated probabilities");
  });
  it("withholds unavailable, nonfinite or negative EPS", () => {
    for (const epsAvg of [undefined, 0, -1, NaN, Infinity]) expect(calibratedScenarios(100, {epsAvg}, "2027-09-25")).toEqual([]);
  });
  it("does not falsely promote an expired or remote forecast to the target horizon", () => {
    expect(selectHorizonEstimate([{date:"2027-01-01", epsAvg:10}], "2026-09-25")).toBeUndefined();
    expect(selectHorizonEstimate([{date:"2030-01-01", epsAvg:10}], "2026-09-25")).toBeUndefined();
  });
  it("does not skip a loss-making horizon year for later positive EPS", () => {
    expect(selectHorizonEstimate([{date:"2027-12-31", epsAvg:-2}, {date:"2028-06-30", epsAvg:3}], "2026-09-25")).toBeUndefined();
  });
  it("handles inverted ranges and negative lower estimates without negative prices", () => {
    const inverted = calibratedScenarios(100, {epsAvg:10, epsLow:15, epsHigh:5}, "2027-09-25");
    expect(inverted[2].fairValue).toBe(64);
    expect(calibratedScenarios(100, {epsAvg:10, epsLow:-5, epsHigh:15}, "2027-09-25")[2].fairValue).toBe(0);
  });
  it("reproduces the same confidence and penalizes dispersion, sparsity, and stale prices", () => {
    const full = deterministicConfidence(confidenceInput);
    expect(full).toEqual(deterministicConfidence(confidenceInput));
    expect(full.score).toBeLessThanOrEqual(full.breadth);
    const sparse = deterministicConfidence({...confidenceInput, estimate: {...confidenceInput.estimate, numAnalystsEps:1, epsHigh:35}});
    expect(sparse.score).toBeLessThan(full.score);
    expect(deterministicConfidence({...confidenceInput, marketAsOf:"2026-08-01"}).score).toBeLessThan(50);
    expect(deterministicConfidence({...confidenceInput, annualEnd:undefined}).score).toBeLessThan(50);
  });
  it("rejects invalid DCF inputs and reports unbracketed growth honestly", () => {
    expect(reverseDcfFromMarketCap(Infinity, 100).available).toBe(false);
    expect(reverseDcfFromMarketCap(1000, -1).available).toBe(false);
    expect(reverseDcfFromMarketCap(1e30, 1).available).toBe(false);
  });
});

afterEach(() => vi.unstubAllGlobals());
it("SEC never subtracts capex or computes margin across different periods", async () => {
  const fact = (val:number, start:string, end:string, form="10-K") => ({units:{USD:[{val, start, end, form, filed:"2026-08-01"}]}});
  const gaap = {
    Revenues: fact(1000,"2025-01-01","2025-12-31"),
    NetIncomeLoss: fact(200,"2025-01-01","2025-12-31"),
    NetCashProvidedByUsedInOperatingActivities: fact(300,"2025-01-01","2025-12-31"),
    PaymentsToAcquirePropertyPlantAndEquipment: fact(50,"2024-01-01","2024-12-31"),
    RevenueFromContractWithCustomerExcludingAssessedTax: fact(300,"2026-04-01","2026-06-30","10-Q"),
    GrossProfit: fact(100,"2026-01-01","2026-03-31","10-Q"),
  };
  vi.stubGlobal("fetch", vi.fn(async (url:string) => ({ok:true, json:async()=>url.includes("company_tickers") ? {0:{ticker:"TEST",cik_str:1,title:"TEST"}} : url.includes("companyfacts") ? {facts:{"us-gaap":gaap}} : {}})));
  const result = await new SecProvider().getFundamentals("TEST");
  expect(result.revenue).toBe(1000);
  expect(result.operatingCashFlow).toBe(300);
  expect(result.freeCashFlow).toBeUndefined();
  expect(result.latestQuarterRevenue).toBe(300);
  expect(result.latestQuarterGrossMargin).toBeUndefined();
});

it("extracts USD annual 20-F facts for foreign issuers even without 10-K or 10-Q", async () => {
  const fact = (val:number) => ({units:{USD:[{val,start:"2025-01-01",end:"2025-12-31",form:"20-F",filed:"2026-04-30"}]}});
  const gaap = {Revenues:fact(529800000),NetIncomeLoss:fact(82500000),NetCashProvidedByUsedInOperatingActivities:fact(384800000),PaymentsToAcquirePropertyPlantAndEquipment:fact(4066000000)};
  vi.stubGlobal("fetch", vi.fn(async (url:string) => ({ok:true,json:async()=>url.includes("company_tickers") ? {0:{ticker:"NBIS",cik_str:1513845,title:"Nebius"}} : url.includes("companyfacts") ? {facts:{"us-gaap":gaap}} : {}})));
  const result = await new SecProvider().getFundamentals("NBIS");
  expect(result.latestAnnualForm).toBe("20-F");
  expect(result.latestAnnualPeriodEnd).toBe("2025-12-31");
  expect(result.revenue).toBe(529800000);
  expect(result.freeCashFlow).toBe(-3681200000);
  expect(result.latestQuarterRevenue).toBeUndefined();
});
