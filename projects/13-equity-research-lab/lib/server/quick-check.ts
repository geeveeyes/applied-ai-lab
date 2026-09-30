import { unstable_cache } from "next/cache";
import { providers } from "../providers";
import { buildQuickCheck, type QuickCheck } from "../quick-check";
import { reserveUsage, usageStore } from './usage-budget';
import { isLiveMode } from "./research-budget";

// Quick checks use no LLM, but still call FMP (and SEC). They are metered with the
// existing generic equity_provider_usage table (no migration) and cached per ticker per
// UTC day, so re-checking a watchlist does not repeat provider calls.

export const DEFAULT_QUICK_CAP = 60;
export function quickCap(env: Record<string, string | undefined> = process.env) {
  const n = Number(env.QUICK_CHECK_DAILY_CAP);
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : DEFAULT_QUICK_CAP;
}

export { UsageLimitError as QuickCapError } from './usage-budget';

async function claimSlot() {
 await reserveUsage(usageStore(),'quick_check',new Date().toISOString().slice(0,10),quickCap());
}

async function fresh(ticker: string): Promise<QuickCheck> {
  await claimSlot();
  const [f, m, a] = await Promise.allSettled([providers.sec.getFundamentals(ticker), providers.market.getMarket(ticker), providers.analysts.getAnalysts(ticker)]);
  if (m.status === "rejected") throw new Error(`No verified price for ${ticker}: ${m.reason instanceof Error ? m.reason.message : "quote provider failed"}`);
  return buildQuickCheck(ticker, f.status === "fulfilled" ? f.value : null, m.value, a.status === "fulfilled" ? a.value : null);
}

// Only successful results are cached (errors are not), and only cache misses claim a slot.
const cached = unstable_cache((ticker: string, _day: string) => fresh(ticker), ["quick-check-v2"], { revalidate: 6 * 3600 });

export async function runQuickCheck(tickerRaw: string): Promise<QuickCheck> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(ticker)) throw new Error("Invalid ticker symbol");
  if (!isLiveMode()) throw new Error("Quick checks need live market data (NEXT_PUBLIC_APP_MODE=live).");
  return cached(ticker, new Date().toISOString().slice(0, 10));
}
