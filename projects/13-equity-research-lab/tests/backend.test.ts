import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseAlphaQuote, AlphaVantageMarketProvider } from "../lib/providers/alpha-vantage";
import { FallbackMarketProvider } from "../lib/providers/market";
import { ownerHash, saveSnapshot, readSnapshots } from "../lib/server/archive";
import { demoResearch } from "../lib/mock-data";
const mocks = vi.hoisted(() => ({ database: vi.fn(), cookies: vi.fn() }));
vi.mock("../lib/server/supabase", () => ({ database: mocks.database }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
const body = { "Global Quote": { "01. symbol": "NBIS", "05. price": "115.20", "07. latest trading day": "2026-09-24", "10. change percent": "2.50%" } };
const now = new Date("2026-09-25T12:00:00Z");
beforeEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("quote validation and fallback", () => {
  it("preserves the actual trading date without inventing a timestamp", () => {
    expect(parseAlphaQuote(body, "NBIS", now)).toMatchObject({ price: 115.2, timestamp: "2026-09-24", priceTiming: "end-of-day", source: "Alpha Vantage" });
  });
  it("rejects symbol mismatches, missing price, future dates and provider quota messages", () => {
    expect(() => parseAlphaQuote(body, "IBM", now)).toThrow();
    expect(() => parseAlphaQuote({}, "NBIS", now)).toThrow();
    expect(() => parseAlphaQuote({ ...body, "Global Quote": { ...body["Global Quote"], "07. latest trading day": "2026-09-26" } }, "NBIS", now)).toThrow();
    expect(() => parseAlphaQuote({ Information: "secret token provider message" }, "NBIS", now)).toThrow("request allowance");
    expect(() => parseAlphaQuote({ ...body, "Global Quote": { ...body["Global Quote"], "05. price": "Infinity" } }, "NBIS", now)).toThrow();
  });
  it("avoids the fallback when FMP supplies a valid price", async () => {
    const fallback = { getMarket: vi.fn() };
    const provider = new FallbackMarketProvider({ getMarket: vi.fn().mockResolvedValue({ price: 10, citations: [] }) }, fallback);
    expect((await provider.getMarket("NVDA")).source).toBe("FMP");
    expect(fallback.getMarket).not.toHaveBeenCalled();
  });
  it("uses end-of-day fallback on an FMP error", async () => {
    const provider = new FallbackMarketProvider({ getMarket: vi.fn().mockRejectedValue(new Error("FMP 402")) }, { getMarket: vi.fn().mockResolvedValue(parseAlphaQuote(body, "NBIS", now)) });
    expect(await provider.getMarket("NBIS")).toMatchObject({ price: 115.2, notes: expect.arrayContaining(["FMP 402"]) });
  });
  it("does not call the provider when persistent quota accounting is unavailable", async () => {
    vi.stubEnv("ALPHA_VANTAGE_API_KEY", "test");
    mocks.database.mockReturnValue(null);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(new AlphaVantageMarketProvider().getMarket("NBIS")).rejects.toThrow("Supabase");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reuses a recent quote without consuming a daily request", async () => {
    vi.stubEnv("ALPHA_VANTAGE_API_KEY", "test");
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: { payload: { price: 115.2, citations: [] }, fetched_at: new Date().toISOString() } }) };
    const rpc = vi.fn(); mocks.database.mockReturnValue({ from: () => query, rpc });
    expect((await new AlphaVantageMarketProvider().getMarket("NBIS")).price).toBe(115.2);
    expect(rpc).not.toHaveBeenCalled();
  });
});
describe("private immutable archive", () => {
  it("rejects malformed workspace tokens and hashes valid ones", () => {
    expect(ownerHash("attacker")).toBeNull();
    expect(ownerHash()).toBeNull();
    expect(ownerHash("a".repeat(64))).toHaveLength(64);
    expect(ownerHash("a".repeat(64))).not.toBe("a".repeat(64));
  });
  it("scopes individual reads by owner as well as report id", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "a".repeat(64) }) });
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query), not: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn().mockResolvedValue({ data: [] }) };
    mocks.database.mockReturnValue({ from: () => query });
    expect(await readSnapshots("private-id")).toEqual([]);
    expect(query.eq).toHaveBeenCalledWith("owner_hash", ownerHash("a".repeat(64)));
    expect(query.eq).toHaveBeenCalledWith("id", "private-id");
  });
  it("uses insert only and reports database failure without losing the report", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "a".repeat(64) }) });
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    mocks.database.mockReturnValue({ from: () => ({ insert }) });
    const run = { ...demoResearch("NBIS"), dataMode: "hybrid" as const };
    expect(await saveSnapshot(run)).toMatchObject({ id: run.id, storage: "unavailable" });
    expect(insert).toHaveBeenCalledOnce();
  });
});
