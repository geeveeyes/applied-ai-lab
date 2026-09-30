import { describe, expect, it } from "vitest";
import { diversification, portfolioFit } from "../lib/diversification";
import type { Holdings } from "../lib/holdings";

const h = (positions: Holdings["positions"], cash = 0, coverage: Holdings["coverage"] = "complete"): Holdings =>
  ({ version: 1, scope: "test", asOf: "2026-09-30", coverage, totalValue: positions.reduce((a, p) => a + p.shares * p.price, 0) + cash, cashAvailable: cash, positions });

describe("diversification", () => {
  it("flags a single-stock concentration with the trim needed to reach the limit", () => {
    const d = diversification(h([{ symbol: "AMZN", shares: 600, price: 1000, kind: "stock" }, { symbol: "VTI", shares: 300, price: 1000, kind: "fund" }], 100000));
    expect(d.largest).toEqual({ symbol: "AMZN", weight: 0.6 });
    expect(d.verdict).toBe("Highly concentrated");
    const amzn = d.positions.find(p => p.symbol === "AMZN")!;
    expect(amzn.trimToLimit).toBeCloseTo(600000 - 100000);
    expect(d.sectors[0]).toMatchObject({ sector: "Digital platforms", overLimit: true });
    expect(d.fundWeight).toBeCloseTo(0.3);
  });
  it("treats an evenly spread portfolio as diversified", () => {
    const syms = ["NVDA", "MSFT", "V", "JPM", "ABBV", "XOM", "UNP", "PG", "MDLZ", "LIN", "GD", "COP"];
    const d = diversification(h(syms.map(symbol => ({ symbol, shares: 1, price: 100, kind: "stock" as const })), 0), { singleStock: 0.10, sector: 0.30 });
    expect(d.effectiveHoldings).toBeCloseTo(12);
    expect(d.verdict).toBe("Diversified");
    expect(d.flags).toEqual([]);
  });
  it("counts funds as diversified and notes partial coverage and unknown sectors", () => {
    const d = diversification(h([{ symbol: "VOO", shares: 10, price: 500, kind: "fund" }, { symbol: "ZZZZ", shares: 1, price: 800, kind: "stock" }], 0, "partial"));
    expect(d.flags.join(" ")).toMatch(/selected holdings only/);
    expect(d.flags.join(" ")).toMatch(/Sector is unknown/);
    expect(d.effectiveHoldings).not.toBeNull();
  });
  it("portfolio fit reports room under the single-stock limit", () => {
    const fit = portfolioFit(h([{ symbol: "MSFT", shares: 10, price: 500, kind: "stock" }], 95000), "MSFT", 8000);
    expect(fit.weightBefore).toBeCloseTo(0.05);
    expect(fit.room).toBeCloseTo(5000);
    expect(fit.exceeds).toBe(true);
  });
});
