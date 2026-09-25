"use client";
import { use, useEffect, useState } from "react";
import { loadRuns } from "@/lib/archive";
import { ResearchView } from "@/components/ResearchView";
import type { ResearchRun } from "@/lib/types";

export default function SavedResearch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<ResearchRun | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    setRun(undefined);
    const local = loadRuns().find(r => r.id === id) ?? null;
    fetch(`/api/research/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(async response => response.ok ? await response.json() as ResearchRun : local)
      .then(saved => { if (active) setRun(saved); })
      .catch(() => { if (active) setRun(local); });
    return () => { active = false; };
  }, [id]);
  if (run === undefined) return <p>Loading saved report…</p>;
  if (!run) return <section><h1>Snapshot unavailable</h1><p>This report could not be loaded from your private workspace or browser backup.</p><a href="/research">Back to archive</a></section>;
  return <><p className="warning">Saved report from {run.analyzedAt.replace("T", " ").replace("Z", " UTC")}. Prices and evidence reflect that time. <a href={`/company/${encodeURIComponent(run.ticker)}`}>Run fresh research</a></p><ResearchView run={run} /></>;
}
