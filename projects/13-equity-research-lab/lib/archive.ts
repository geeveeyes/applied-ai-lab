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
