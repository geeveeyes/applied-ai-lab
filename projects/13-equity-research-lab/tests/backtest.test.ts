import { describe, expect, it } from "vitest";
import { backtestTicker, pointInTime, priceAt, summarize, yearlyDates } from "../lib/backtest";
import type { History } from "../lib/portfolio/history";

const fy = (year: number, val: number, filed: string) => ({ val, form: "10-K", start: `${year}-01-01`, end: `${year}-12-31`, filed });
// Revenue grows 10%/yr; FY2020 was filed 2021-02-15, FY2021 on 2022-02-15, etc.
const facts = { facts: {
  "us-gaap": {
    Revenues: { units: { USD: [2016, 2017, 2018, 2019, 2020, 2021, 2022].map((y, i) => fy(y, 100e9 * Math.pow(1.1, i), `${y + 1}-02-15`)) } },
    NetIncomeLoss: { units: { USD: [2019, 2020, 2021, 2022].map(y => fy(y, 15e9, `${y + 1}-02-15`)) } },
    NetCashProvidedByUsedInOperatingActivities: { units: { USD: [2019, 2020, 2021, 2022].map(y => fy(y, 20e9, `${y + 1}-02-15`)) } },
    PaymentsToAcquirePropertyPlantAndEquipment: { units: { USD: [2019, 2020, 2021, 2022].map(y => fy(y, 5e9, `${y + 1}-02-15`)) } },
    CashAndCashEquivalentsAtCarryingValue: { units: { USD: [{ val: 10e9, end: "2020-12-31", filed: "2021-02-15" }, { val: 12e9, end: "2021-12-31", filed: "2022-02-15" }] } },
  },
  dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ val: 1e9, end: "2021-01-31", filed: "2021-02-15" }, { val: 1e9, end: "2022-01-31", filed: "2022-02-15" }] } } },
} };
// Monthly history: the actual price is 200 until a 2:1 split in mid-2022; adjusted closes are expressed in post-split units.
const months = (from: string, n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(`${from}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 10); });
const stock: History = { symbol: "ACME", source: "t", retrievedAt: "t", adjusted: true,
  prices: months("2020-01-31", 48).map((date, i) => ({ date, close: 100 + i, raw: date < "2022-07-01" ? 2 * (100 + i) : 100 + i })) };
const spy: History = { symbol: "SPY", source: "t", retrievedAt: "t", adjusted: true, prices: months("2020-01-31", 48).map((date, i) => ({ date, close: 300 + i })) };

describe("backtest", () => {
  it("uses only facts filed by the date (no look-ahead)", () => {
    const early = pointInTime(facts, "2021-01-31");
    expect(early.periodEnd).toBe("2019-12-31"); // FY2020 not yet filed on Jan 31, 2021
    const later = pointInTime(facts, "2021-03-01");
    expect(later.periodEnd).toBe("2020-12-31");
    expect(later.revenue3yAgo).toBeCloseTo(100e9 * Math.pow(1.1, 1), -6);
    expect(later.shares).toBe(1e9);
    expect(later.cash).toBe(10e9);
  });
  it("prices within 40 days only; raw vs adjusted", () => {
    expect(priceAt(stock, "2021-01-31")).toBe(112);
    expect(priceAt(stock, "2021-01-31", "raw")).toBe(224);
    expect(priceAt(stock, "2019-01-31")).toBeUndefined();
  });
  it("values against the actual pre-split price and measures adjusted total return vs SPY", () => {
    const { rows, skipped } = backtestTicker("ACME", facts, stock, spy, ["2021-03-31", "2022-03-31"]);
    expect(skipped).toEqual([]);
    expect(rows[0].price).toBe(2 * (100 + 14)); // actual price, not the adjusted 114
    expect(rows[0].growthPct).toBeCloseTo(10, 0);
    expect(rows[0].returnPct).toBeCloseTo((126 / 114 - 1) * 100, 1);
    expect(rows[0].excessPct).toBeCloseTo(rows[0].returnPct - rows[0].spyReturnPct, 1);
  });
  it("skips dates without filed data or history, and reports why", () => {
    const { rows, skipped } = backtestTicker("ACME", facts, stock, spy, ["2016-01-31", "2023-06-30"]);
    expect(rows).toEqual([]);
    expect(skipped.length).toBe(2);
  });
  it("summarizes by zone and builds yearly dates that leave 12 months of history", () => {
    const s = summarize([{ ticker: "A", date: "d", price: 1, zone: "Buy zone", returnPct: 20, spyReturnPct: 10, excessPct: 10 }, { ticker: "B", date: "d", price: 1, zone: "Buy zone", returnPct: 0, spyReturnPct: 10, excessPct: -10 }]);
    expect(s[0]).toMatchObject({ zone: "Buy zone", n: 2, meanExcess: 0, medianExcess: 0, beatSpy: 0.5 });
    const d = yearlyDates(2015, new Date("2026-09-30"));
    expect(d[0]).toBe("2015-01-31");
    expect(d[d.length - 1]).toBe("2025-01-31");
  });
});
