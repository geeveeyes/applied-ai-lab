"use client";
import { useEffect, useState } from "react";
import type { ResearchRun } from "@/lib/types";
import { saveRun, loadRuns } from "@/lib/archive";
export function SnapshotRecorder({ run }: { run: ResearchRun }) {
  const [local, setLocal] = useState<boolean | null>(null);
  useEffect(() => { saveRun(run); setLocal(loadRuns().some(saved => saved.id === run.id)); }, [run]);
  return <p role="status" className={run.storage === "unavailable" ? "warning" : "muted"}>
    {run.storage === "cloud" ? "Saved to your private cloud archive." : run.storage === "unavailable" ? "Cloud saving unavailable." : "Cloud saving is not enabled for this report."}
    {local === true ? " A browser copy is available." : local === false ? " Browser storage is unavailable; keep this page open to retain this report." : ""}
  </p>;
}
