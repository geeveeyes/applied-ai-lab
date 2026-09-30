import { describe, expect, it } from "vitest";
import { gradeEntry, type JournalEntry } from "../lib/journal";
const e = (action: JournalEntry["action"]): JournalEntry => ({ id: "1", date: "2026-09-01", symbol: "MSFT", action, price: 100, reason: "test" });
describe("journal grading", () => {
  it("grades buys and sells by price direction; holds are not directional", () => {
    expect(gradeEntry(e("Bought"), { price: 110, date: "2026-09-30T00:00:00Z" })).toEqual({ movePct: 10, days: 29, right: true });
    expect(gradeEntry(e("Sold"), { price: 110, date: "2026-09-30" })!.right).toBe(false);
    expect(gradeEntry(e("Held"), { price: 90, date: "2026-09-30" })!.right).toBeNull();
  });
  it("needs a later price", () => {
    expect(gradeEntry(e("Bought"), { price: 110, date: "2026-09-01" })).toBeNull();
    expect(gradeEntry(e("Bought"))).toBeNull();
  });
});
