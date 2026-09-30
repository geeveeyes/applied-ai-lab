import { unstable_cache } from "next/cache";
import { providers } from "../providers";
import { buildQuickCheck, type QuickCheck } from "../quick-check";
import { database } from "./supabase";
import { isLiveMode } from "./research-budget";

// Quick checks use no LLM, but still call FMP (and SEC). They are metered with the
// existing generic equity_provider_usage table (no migration) and cached per ticker per
// UTC day, so re-checking a watchlist does not repeat provider calls.

export const DEFAULT_QUICK_CAP = 60;
export function quickCap(env: Record<string, string | undefined> = process.env) {
  const n = Number(env.QUICK_CHECK_DAILY_CAP);
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : DEFAULT_QUICK_CAP;
}

/** Claims one quick-check slot for today. Soft (read-then-write) cap; fails closed without a DB. */
async function claimSlot(): Promise<void> {
  const db = database();
  if (!db) throw new Error("Quick checks are paused because usage cannot be metered (archive database unavailable).");
  const day = new Date().toISOString().slice(0, 10), cap = quickCap();
  const { data, error } = await db.from("equity_provider_usage").select("requests").eq("provider", "quick_check").eq("day", day).maybeSingle();
  if (error) throw new Error("Quick-check usage could not be verified. Try again shortly.");
  const used = data?.requests ?? 0;
  if (used >= cap) throw new QuickCapError(`Daily quick-check limit reached (${cap} new companies per UTC day). Already-checked companies still load. Raise QUICK_CHECK_DAILY_CAP to allow more.`);
  const { error: writeError } = await db.from("equity_provider_usage").upsert({ provider: "quick_check", day, requests: used + 1 }, { onConflict: "provider,day" });
  if (writeError) throw new Error("Quick-check usage could not be recorded. Try again shortly.");
}
export class QuickCapError extends Error {}

async function fresh(ticker: string): Promise<QuickCheck> {
  await claimSlot();
  const [f, m, a] = await Promise.allSettled([providers.sec.getFundamentals(ticker), providers.market.getMarket(ticker), providers.analysts.getAnalysts(ticker)]);
  if (m.status === "rejected") throw new Error(`No verified price for ${ticker}: ${m.reason instanceof Error ? m.reason.message : "quote provider failed"}`);
  return buildQuickCheck(ticker, f.status === "fulfilled" ? f.value : null, m.value, a.status === "fulfilled" ? a.value : null);
}

// Only successful results are cached (errors are not), and only cache misses claim a slot.
const cached = unstable_cache((ticker: string, _day: string) => fresh(ticker), ["quick-check-v1"], { revalidate: 6 * 3600 });

export async function runQuickCheck(tickerRaw: string): Promise<QuickCheck> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(ticker)) throw new Error("Invalid ticker symbol");
  if (!isLiveMode()) throw new Error("Quick checks need live market data (NEXT_PUBLIC_APP_MODE=live).");
  return cached(ticker, new Date().toISOString().slice(0, 10));
}
