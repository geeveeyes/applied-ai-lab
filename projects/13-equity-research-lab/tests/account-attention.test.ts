import { describe, expect, it } from "vitest";
import { accountAttention, type AttentionAccount } from "../lib/account-attention";

const account = (overrides: Partial<AttentionAccount> = {}): AttentionAccount => ({
  institution: "Fidelity", name: "Brokerage", reportedTotal: { amount: 100_000, currency: "USD" },
  positionsAvailable: true, positions: [], ...overrides,
});

describe("account attention", () => {
  it("flags Amazon within its account and states that other accounts are excluded", () => {
    const review = accountAttention(account({ positions: [
      { symbol: "AMZN", kind: "stock", units: 100, price: 200, currency: "USD", cashEquivalent: false },
    ] }));
    expect(review.amzn).toEqual({ valueUsd: 20_000, weight: 0.2 });
    expect(review.findings.some(f => f.title === "AMZN is a large position in this account")).toBe(true);
    expect(review.findings.some(f => f.detail.includes("not combined here"))).toBe(true);
  });

  it("groups sector exposure while keeping funds and cash-equivalent positions out of stock totals", () => {
    const review = accountAttention(account({ positions: [
      { symbol: "AMZN", kind: "stock", units: 100, price: 200, currency: "USD", cashEquivalent: false },
      { symbol: "GOOGL", kind: "stock", units: 100, price: 200, currency: "USD", cashEquivalent: false },
      { symbol: "QQQ", kind: "etf", units: 10, price: 500, currency: "USD", cashEquivalent: false },
      { symbol: "SPAXX", kind: "mutualfund", units: 500, price: 1, currency: "USD", cashEquivalent: true },
    ] }));
    expect(review.stockPositions.map(p => p.symbol)).toEqual(["AMZN", "GOOGL"]);
    expect(review.fundsValueUsd).toBe(5_000);
    expect(review.findings.some(f => f.title.includes("Digital platforms"))).toBe(true);
    expect(review.findings.some(f => f.title === "Fund overlap is not checked")).toBe(true);
  });

  it("withholds weights and marks unsupported or non-USD exposures as incomplete", () => {
    const review = accountAttention(account({
      reportedTotal: { amount: 100_000, currency: "CAD" },
      positions: [
        { symbol: "SHOP", kind: "stock", units: 10, price: 80, currency: "CAD", cashEquivalent: false },
        { symbol: "OPT", kind: "option", units: 1, price: 100, currency: "USD", cashEquivalent: false },
      ],
    }));
    expect(review.accountValueUsd).toBeNull();
    expect(review.stockPositions).toEqual([]);
    expect(review.incomplete).toBe(true);
    expect(review.findings.some(f => f.title === "Account-level percentages unavailable")).toBe(true);
    expect(review.findings.some(f => f.title === "Some exposure is not counted")).toBe(true);
  });

  it("treats unavailable holdings as unknown rather than an empty portfolio", () => {
    const review = accountAttention(account({ positionsAvailable: false, positions: null }));
    expect(review.findings[0].title).toBe("Holdings unavailable");
    expect(review.stockPositions).toEqual([]);
  });
});
