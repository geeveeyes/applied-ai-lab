import { describe, expect, it } from "vitest";
import { outcomes, summary } from "../lib/track-record";
import type { ResearchRun } from "../lib/types";

const run = (id: string, at: string, price: number, extra: Partial<ResearchRun> = {}) =>
  ({ id, ticker: "ACME", analyzedAt: at, marketAsOf: at, asOfPrice: price, dataMode: "live", ...extra }) as ResearchRun;

describe("track record", () => {
  it("measures later frozen reports at the nearest horizon and never grades non-directional calls", () => {
    const rows = outcomes([run("a", "2026-01-01T00:00:00Z", 100), run("b", "2026-02-02T00:00:00Z", 110), run("c", "2026-04-01T00:00:00Z", 90)]);
    const a30 = rows.find(r => r.reportId === "a" && r.horizon === 30)!;
    expect(a30.laterId).toBe("b");
    expect(a30.priceReturnPct).toBeCloseTo(10);
    expect(a30.verdictCorrect).toBeNull(); // no investment case => not a buy/avoid call
    expect(rows.find(r => r.reportId === "a" && r.horizon === 90)!.laterId).toBe("c");
    expect(rows.some(r => r.horizon === 365)).toBe(false);
  });
  it("records whether price moved toward the earlier intrinsic value", () => {
    const iv = { available: true, perShare: { base: 150, bear: 100, bull: 200 } } as unknown as ResearchRun["intrinsicValuation"];
    const rows = outcomes([run("a", "2026-01-01T00:00:00Z", 100, { intrinsicValuation: iv }), run("b", "2026-01-31T00:00:00Z", 120)]);
    expect(rows[0].movedTowardIntrinsic).toBe(true);
    expect(summary(rows)[0]).toMatchObject({ horizon: 30, measured: 1, towardIntrinsicRate: 1, hitRate: null });
  });
  it("ignores demo and priceless reports", () => {
    expect(outcomes([run("a", "2026-01-01T00:00:00Z", 100, { dataMode: "demo" }), run("b", "2026-02-01T00:00:00Z", 0)])).toEqual([]);
  });
});
