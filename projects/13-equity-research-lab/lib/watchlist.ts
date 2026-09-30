"use client";
import { QUICK_CHECK_VERSION, type QuickCheck } from "./quick-check";
import { sectorGroups } from "./peer-valuation";
import type { Holdings } from "./holdings";

// Browser-only watchlist and the latest quick-check results. Never sent to the server
// except one ticker at a time for a quick check.
const LIST = "equity-watchlist-v1", CHECKS = "equity-quick-checks-v1";
const valid = (t: string) => /^[A-Z.\-]{1,10}$/.test(t);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ } }

export function parseTickers(text: string): string[] {
  return [...new Set(text.toUpperCase().split(/[\s,;]+/).map(t => t.trim()).filter(valid))];
}
export function loadWatchlist(): string[] { return read<string[]>(LIST, []).filter(valid); }
export function saveWatchlist(list: string[]) { write(LIST, [...new Set(list.filter(valid))].slice(0, 100)); }
export function addToWatchlist(tickers: string[]) { saveWatchlist([...loadWatchlist(), ...tickers]); }
export function loadChecks(): Record<string, QuickCheck> { return Object.fromEntries(Object.entries(read<Record<string, QuickCheck>>(CHECKS, {})).filter(([,c])=>c?.version===QUICK_CHECK_VERSION)); }
export function saveCheck(c: QuickCheck) { write(CHECKS, { ...loadChecks(), [c.ticker]: c }); }

/** Example companies in configured sectors where the holdings have no stock exposure. */
export function gapIdeas(h: Holdings | null, limit = 2) {
  const held = new Set((h?.positions ?? []).filter(p => p.kind === "stock" && p.shares > 0).map(p => p.symbol));
  const heldSectors = new Set(sectorGroups().filter(g => g.symbols.some(s => held.has(s))).map(g => g.sector));
  return sectorGroups().filter(g => !heldSectors.has(g.sector)).map(g => ({ sector: g.sector, symbols: g.symbols.slice(0, limit) }));
}

/** Run quick checks two at a time; stops on the daily cap. Saves each result locally. */
export async function runChecks(tickers: string[], onProgress: (msg: string) => void, stop: { current: boolean }) {
  const queue = [...tickers]; let done = 0;
  const worker = async () => {
    while (queue.length && !stop.current) {
      const ticker = queue.shift()!;
      try {
        const r = await fetch("/api/quick-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const body = await r.json();
        if (r.status === 429) { stop.current = true; onProgress(body.error); break; }
        if (!r.ok) throw new Error(body.error);
        saveCheck(body);
      } catch (e) { onProgress(`${ticker}: ${e instanceof Error ? e.message : "check failed"}`); }
      finally { done++; if (!stop.current) onProgress(`Checked ${done} of ${tickers.length}…`); }
    }
  };
  await Promise.all([worker(), worker()]);
  if (!stop.current) onProgress("Done. Quick checks use no AI credits; results are cached per company per day.");
}
