"use client";
import { use, useEffect, useState } from "react";
import { loadRuns } from "@/lib/archive";
import { ResearchView } from "@/components/ResearchView";
import type { ResearchRun } from "@/lib/types";

export default function SavedResearch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<ResearchRun | null | undefined>(undefined);
  useEffect(() => setRun(loadRuns().find(r => r.id === id) ?? null), [id]);
  if (run === undefined) return <p>Loading saved report…</p>;
  if (!run) return <section><h1>Snapshot unavailable</h1><p>This report is not stored in this browser.</p><a href="/research">Back to archive</a></section>;
  return <><p className="warning">Saved report from {run.analyzedAt.replace("T", " ").replace("Z", " UTC")}. Prices and evidence reflect that time. <a href={`/company/${encodeURIComponent(run.ticker)}`}>Run fresh research</a></p><ResearchView run={run} /></>;
}
