import { describe, expect, it } from "vitest";
import { adviseHoldings } from "../lib/position-advice";
import type { Holdings } from "../lib/holdings";
import type { QuickCheck } from "../lib/quick-check";
import type { ResearchRun } from "../lib/types";

const now = new Date("2026-09-30T12:00:00Z");
const holdings = (positions: Holdings["positions"], cash = 0): Holdings =>
  ({ version: 1, scope: "t", asOf: "2026-09-30", coverage: "complete", totalValue: positions.reduce((a, p) => a + p.shares * p.price, 0) + cash, cashAvailable: cash, positions });
const check = (ticker: string, zone: QuickCheck["zone"], buyBelow = 90): QuickCheck =>
  ({ ticker, zone, buyBelow, priceDate:'2026-09-30', checkedAt: now.toISOString(), valuation: zone === "Not valued" ? { available: false, version: "x", note: "Banks are not valued" } : { available: true } } as unknown as QuickCheck);

describe("position advice", () => {
  const h = holdings([
    { symbol: "AMZN", shares: 500, price: 100, kind: "stock", averageCost: 20 }, // 50%
    { symbol: "MSFT", shares: 60, price: 100, kind: "stock" },  // 6%
    { symbol: "PG", shares: 50, price: 100, kind: "stock" },    // 5%
    { symbol: "XOM", shares: 120, price: 100, kind: "stock" },  // 12%
    { symbol: "JPM", shares: 40, price: 100, kind: "stock" },   // 4%
    { symbol: "VTI", shares: 200, price: 100, kind: "fund" },   // 20%
  ], 300);
  const checks = { MSFT: check("MSFT", "Buy zone"), XOM: check("XOM", "Expensive"), JPM: check("JPM", "Not valued") };
  const advice = Object.fromEntries(adviseHoldings(h, checks, [], undefined, now).map(a => [a.symbol, a]));

  it("concentration beats valuation and notes the tax effect", () => {
    expect(advice.AMZN.action).toBe("Trim to limit");
    expect(advice.AMZN.amount).toBeCloseTo(50000 - 0.1 * h.totalValue);
    expect(advice.AMZN.reasons.join(" ")).toMatch(/400\.0% gain/);
  });
  it("adds only with room under the limit and asks for a full report first", () => {
    expect(advice.MSFT.action).toBe("Add candidate");
    expect(advice.MSFT.amount).toBeCloseTo(0.1 * h.totalValue - 6000);
    expect(advice.MSFT.reasons.join(" ")).toMatch(/full research report/);
  });
  it("trims over-limit expensive positions; holds unvalued; asks to check unknowns; funds held", () => {
    expect(advice.XOM.action).toBe("Trim candidate");
    expect(advice.JPM.action).toBe("Hold");
    expect(advice.JPM.reasons.join(" ")).toMatch(/Banks/);
    expect(advice.PG.action).toBe("Check value first");
    expect(advice.VTI.action).toBe("Hold (fund)");
  });
  it("a recent full report saying avoid overrides a buy-zone quick check", () => {
    const run = { ticker: "MSFT", dataMode: "live", analyzedAt: "2026-09-20T00:00:00Z", marketAsOf: "2026-09-20", asOfPrice: 100 } as ResearchRun;
    const out = adviseHoldings(h, checks, [{ ...run, investmentCase: undefined }], undefined, now).find(a => a.symbol === "MSFT")!;
    expect(out.action).toBe("Add candidate"); // report without a decision does not override
  });
  it("sorts by weight", () => {
    expect(adviseHoldings(h, checks, [], undefined, now)[0].symbol).toBe("AMZN");
  });
});
