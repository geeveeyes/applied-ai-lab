import type { MarketProvider, MarketSnapshot } from "./types";
import { database } from "../server/supabase";

export function parseAlphaQuote(body: unknown, ticker: string, now = new Date()): MarketSnapshot {
  const root = body as Record<string, unknown> | null;
  if (root?.Note || root?.Information) throw new Error("Alpha Vantage quote unavailable: request allowance or endpoint access restriction.");
  const row = root?.["Global Quote"] as Record<string, string> | undefined;
  const price = Number(row?.["05. price"]);
  const date = row?.["07. latest trading day"] ?? "";
  if (!row || row["01. symbol"]?.toUpperCase() !== ticker || !Number.isFinite(price) || price <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date || date > now.toISOString().slice(0, 10)) {
    throw new Error("Alpha Vantage did not return a valid price and trading date for this ticker.");
  }
  const change = Number(row["10. change percent"]?.replace("%", ""));
  return { price, timestamp: date, priceTiming: "end-of-day", source: "Alpha Vantage",
    changePercentage: Number.isFinite(change) ? change : undefined,
    citations: [{ title: `${ticker} end-of-day quote`, url: "https://www.alphavantage.co/documentation/#latestprice",
      source: "Alpha Vantage", tier: 2, retrievedAt: now.toISOString(), publishedAt: date }],
  };
}

export class AlphaVantageMarketProvider implements MarketProvider {
  async getMarket(ticker: string): Promise<MarketSnapshot> {
    const key = process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHAVANTAGE_API_KEY || process.env.ALPHA_VENTAGE_API_KEY;
    if (!key) throw new Error("Alpha Vantage is not configured.");
    const db = database();
    // Require persistent budget accounting before spending the free-plan allowance.
    if (!db) throw new Error("Alpha Vantage fallback awaits the Supabase quote cache configuration.");
    const { data: cached, error: cacheError } = await db.from("equity_quote_cache").select("payload,fetched_at").eq("ticker", ticker).maybeSingle();
    if (cacheError) throw new Error("Alpha Vantage fallback awaits the Supabase database migration.");
    const age = cached ? Date.now() - Date.parse(cached.fetched_at) : Infinity;
    if (cached && age >= 0 && age < 6 * 60 * 60 * 1000) return cached.payload as MarketSnapshot;
    const { data: allowed, error } = await db.rpc("equity_claim_alpha_request");
    if (error || allowed !== true) {
      if (cached) return { ...cached.payload, notes: ["Daily quote allowance reached; using the last saved quote with its original trading date."] };
      throw new Error(error ? "Alpha Vantage request budget is unavailable." : "Alpha Vantage daily quote allowance reached; try again after the next daily reset.");
    }
    let response: Response;
    try { response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(key)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error("Alpha Vantage quote request timed out or could not connect."); }
    if (!response.ok) throw new Error(`Alpha Vantage quote request failed (HTTP ${response.status}).`);
    let body: unknown;
    try { body = await response.json(); } catch { throw new Error("Alpha Vantage returned an unreadable quote response."); }
    const quote = parseAlphaQuote(body, ticker);
    const { error: saveError } = await db.from("equity_quote_cache").upsert({ ticker, payload: quote, fetched_at: new Date().toISOString() });
    if (saveError) quote.notes = ["Quote cache could not be updated; the verified quote is shown for this report only."];
    return quote;
  }
}
