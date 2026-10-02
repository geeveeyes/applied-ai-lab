import { describe, expect, it, vi } from "vitest";
import type { Account } from "snaptrade-typescript-sdk";
import { createPersonalReader, readPersonalPortfolio, type PortfolioReader } from "../lib/server/snaptrade-personal";
const now = new Date("2026-10-01T12:00:00Z");
function account(extra = {}): Account {
  return { is_paper: false, id: "a", brokerage_authorization: "connection", name: "Test", number: "private",
    institution_name: "Test broker", institution_account_id: "stable", created_date: "2026-01-01",
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: now.toISOString() } },
    balance: { total: { amount: 1000, currency: "USD" } }, ...extra };
}
function reader(accounts = [account()]): PortfolioReader {
  return { accounts: vi.fn().mockResolvedValue(accounts),
    positions: vi.fn().mockResolvedValue({ results: [], data_freshness: { as_of: now.toISOString() } }),
    balances: vi.fn().mockResolvedValue([{ currency: { code: "USD" }, cash: 100, buying_power: 500 }]) };
}
describe("personal read-only connection", () => {
  it("requires credentials without disclosing them", () => {
    expect(() => createPersonalReader({ SNAPTRADE_CLIENT_ID: "secret-id" })).toThrow("setup is incomplete");
  });
  it("deduplicates a stable institution account and excludes buying power", async () => {
    const r = reader([account(), account({ id: "b" })]);
    const result = await readPersonalPortfolio(r, now);
    expect(result.accounts).toHaveLength(1);
    expect(r.positions).toHaveBeenCalledTimes(1);
    expect(result.accounts[0].cash).toEqual([{ currency: "USD", amount: 100 }]);
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("preserves missing cash as unknown", async () => {
    const r = reader(); r.balances = vi.fn().mockResolvedValue([{ currency: { code: "USD" } }]);
    expect((await readPersonalPortfolio(r, now)).accounts[0].cash?.[0].amount).toBeNull();
  });
  it("keeps failed positions distinct from empty holdings and redacts errors", async () => {
    const r = reader(); r.positions = vi.fn().mockRejectedValue(new Error("secret-token"));
    const result = await readPersonalPortfolio(r, now);
    expect(result.accounts[0].positions).toBeNull();
    expect(result.accounts[0].cash).not.toBeNull();
    expect(JSON.stringify(result)).not.toContain("secret-token");
  });
  it("does not read unsupported holdings or imply they are empty", async () => {
    const r = reader([account({ sync_status: { holdings: { holdings_unavailable: true } } })]);
    const result = await readPersonalPortfolio(r, now);
    expect(r.positions).not.toHaveBeenCalled();
    expect(result.accounts[0].positions).toBeNull();
    expect(result.accounts[0].total?.amount).toBe(1000);
  });
  it("bounds provider reads before fetching positions", async () => {
    const r = reader(Array.from({ length: 21 }, (_, i) => account({ id: String(i) })));
    await expect(readPersonalPortfolio(r, now)).rejects.toThrow("20 accounts");
    expect(r.positions).not.toHaveBeenCalled();
  });
  it("filters to the requested institutions before applying the account limit", async () => {
    const fidelity = account({ institution_name: "Fidelity" });
    const robinhood = account({ id: "rh", institution_name: "Robinhood Financial", institution_account_id: "rh-id" });
    const r = reader([fidelity, robinhood, ...Array.from({ length: 21 }, (_, i) => account({
      id: `other-${i}`, institution_name: "Wells Fargo", institution_account_id: `wf-${i}`,
    }))]);
    const result = await readPersonalPortfolio(r, now, { institutions: ["Fidelity", "Robinhood"] });
    expect(result.accounts.map(a => a.institution)).toEqual(["Fidelity", "Robinhood Financial"]);
    expect(result.excludedAccountCount).toBe(21);
    expect(r.positions).toHaveBeenCalledTimes(2);
    expect(result.accounts.every(a => a.institution !== "Wells Fargo")).toBe(true);
  });
  it("flags missing identity and stale data", async () => {
    const result = await readPersonalPortfolio(reader([account({ institution_account_id: null, sync_status: {} })]), now);
    expect(result.accounts[0].warnings).toHaveLength(3);
  });
});
