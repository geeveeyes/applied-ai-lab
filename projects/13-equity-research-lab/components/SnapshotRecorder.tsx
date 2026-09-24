"use client";
import { useEffect } from "react";
import type { ResearchRun } from "@/lib/types";
import { saveRun } from "@/lib/archive";
export function SnapshotRecorder({ run }: { run: ResearchRun }) {
  useEffect(() => { saveRun(run); }, [run]);
  return null;
}
