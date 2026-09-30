import { describe, expect, it } from "vitest";
import { buildQuickCheck, rankChecks, zoneFor, MARGIN_OF_SAFETY } from "../lib/quick-check";
import { quickCap, DEFAULT_QUICK_CAP } from "../lib/server/quick-check";
import { parseTickers, gapIdeas } from "../lib/watchlist";
import type { FundamentalsSnapshot, MarketSnapshot, AnalystSnapshot } from "../lib/providers/types";
import type { Holdings } from "../lib/holdings";

const f: FundamentalsSnapshot = { companyName: "Acme", revenue: 50e9, operatingCashFlow: 10e9, capitalExpenditures: 2e9, freeCashFlow: 8e9, netIncome: 7e9, annualDilutedEps: 7, cash: 5e9, debt: 3e9, latestAnnualPeriodEnd: "2025-12-31", citations: [] };
const m = (price: number): MarketSnapshot => ({ price, marketCap: price * 1e9, yearHigh: price * 1.25, priceAvg200: price * 0.9, timestamp: "2026-09-30", citations: [] });
const a: AnalystSnapshot = { calls: [], estimates: [{ date: "2027-12-31", revenueAvg: 60.5e9 }], consensusTarget: 120, citations: [], unavailable: [] };
const now = new Date("2026-09-30T12:00:00Z");

describe("quick check", () => {
  it("values, zones and derives a buy-below price with the margin of safety", () => {
    const q = buildQuickCheck("ACME", f, m(100), a, now);
    if (!q.valuation.available) throw new Error(q.valuation.note);
    expect(q.buyBelow).toBeCloseTo(q.valuation.perShare.base * (1 - MARGIN_OF_SAFETY), 2);
    expect(q.zone).toBe(zoneFor(q.valuation, 100));
    expect(q.metrics.trailingPe).toBeCloseTo(14.3, 1);
    expect(q.metrics.fcfMargin).toBeCloseTo(16);
    expect(q.metrics.offYearHighPct).toBeCloseTo(-20);
    expect(q.metrics.analystTargetUpsidePct).toBeCloseTo(20);
  });
  it("marks cheap prices as Buy zone and rich ones as Expensive", () => {
    expect(buildQuickCheck("ACME", f, m(30), a, now).zone).toBe("Buy zone");
    expect(buildQuickCheck("ACME", f, m(1000), a, now).zone).toBe("Expensive");
  });
  it("does not value banks and flags missing data instead of guessing", () => {
    const q = buildQuickCheck("JPM", { ...f, financialInstitution: true }, m(100), null, now);
    expect(q.zone).toBe("Not valued");
    expect(q.buyBelow).toBeUndefined();
    expect(q.flags.join(" ")).toMatch(/No consensus estimates/);
  });
  it("refuses to run without a verified price", () => {
    expect(() => buildQuickCheck("ACME", f, { citations: [] }, a, now)).toThrow(/No verified price/);
  });
  it("ranks buy zone first, then by upside", () => {
    const r = rankChecks([buildQuickCheck("RICH", f, m(1000), a, now), buildQuickCheck("CHEAP", f, m(30), a, now), buildQuickCheck("JPM", { ...f, financialInstitution: true }, m(100), a, now)]);
    expect(r.map(x => x.ticker)).toEqual(["CHEAP", "RICH", "JPM"]);
  });
  it("cap parsing", () => {
    expect(quickCap({ QUICK_CHECK_DAILY_CAP: "20" })).toBe(20);
    expect(quickCap({ QUICK_CHECK_DAILY_CAP: "x" })).toBe(DEFAULT_QUICK_CAP);
  });
});

describe("watchlist helpers", () => {
  it("parses and de-duplicates tickers", () => {
    expect(parseTickers("msft, v  pg;MSFT bad$ BRK-B")).toEqual(["MSFT", "V", "PG", "BRK-B"]);
  });
  it("suggests sectors the holdings don't cover", () => {
    const h = { version: 1, scope: "x", asOf: "2026-09-30", coverage: "complete", totalValue: 1, cashAvailable: 0,
      positions: [{ symbol: "AMZN", shares: 1, price: 1, kind: "stock" }, { symbol: "MSFT", shares: 1, price: 1, kind: "stock" }] } as Holdings;
    const sectors = gapIdeas(h).map(i => i.sector);
    expect(sectors).not.toContain("Digital platforms");
    expect(sectors).not.toContain("Software platforms");
    expect(sectors).toContain("Household products");
    expect(gapIdeas(null).length).toBeGreaterThan(10);
  });
});
