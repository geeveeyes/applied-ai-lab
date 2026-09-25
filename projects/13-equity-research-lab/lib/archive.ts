"use client";
import type { ResearchRun } from "./types";

const KEY = "equity-research-lab:runs";

export function loadRuns(): ResearchRun[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(r => r && typeof r.id === "string" && typeof r.ticker === "string" && Array.isArray(r.scenarios)) : [];
  } catch { return []; }
}

export function saveRun(run: ResearchRun) {
  if (typeof window === "undefined") return;
  const existing = loadRuns();
  if (existing.some((x) => x.id === run.id)) return;
  try { localStorage.setItem(KEY, JSON.stringify([run, ...existing].slice(0, 100))); } catch { /* Storage may be disabled or full; research must still render. */ }
}

export async function loadArchive(): Promise<{ runs: ResearchRun[]; message: string }> {
  const local = loadRuns();
  try {
    const response = await fetch("/api/research", { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Cloud archive unavailable");
    const { runs: cloud } = await response.json() as { runs: ResearchRun[] };
    const merged = new Map(local.map(run => [run.id, run]));
    cloud.forEach(run => merged.set(run.id, run));
    return { runs: [...merged.values()].sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt)), message: "Cloud archive connected. Browser-only reports are also shown." };
  } catch { return { runs: local, message: "Cloud archive unavailable. Showing reports saved in this browser." }; }
}
