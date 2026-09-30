"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadRuns, saveRun } from "@/lib/archive";
import type { ResearchRun } from "@/lib/types";

type Budget = { metered: boolean; used: number; cap: number; remaining: number; reason?: string };

/** Paid research starts only from an explicit click (POST). Page views never spend credits. */
export function RunResearch({ ticker, force = false }: { ticker: string; force?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [local, setLocal] = useState<ResearchRun | null>(null);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setLocal(loadRuns().find(r => r.ticker === ticker && r.analyzedAt.startsWith(today) && r.score > 0) ?? null);
    fetch("/api/research-budget", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(setBudget).catch(() => {});
  }, [ticker]);
  async function run() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker, force }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Research could not complete.");
      saveRun(body as ResearchRun);
      router.push(`/research/${encodeURIComponent(body.id)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Research could not complete."); setBusy(false); }
  }
  const blocked = !!budget?.reason;
  return <div className="panel">
    {local && !force && <p>You already have today&apos;s report for {ticker}. <a href={`/research/${encodeURIComponent(local.id)}`}>Open it</a> without spending credits.</p>}
    <button disabled={busy || blocked} onClick={() => void run()}>{busy ? "Researching… this can take a few minutes" : force ? `Run a fresh ${ticker} report` : `Run ${ticker} research`}</button>
    {budget?.metered && <p className="muted">Live research budget today: {budget.remaining} of {budget.cap} new reports left (UTC day). Same-day reports are reused automatically.</p>}
    {budget?.reason && <p role="alert">{budget.reason}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
