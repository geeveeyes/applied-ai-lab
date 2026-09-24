"use client";
import type { ResearchRun } from "./types";

const KEY = "equity-research-lab:runs";

export function loadRuns(): ResearchRun[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as ResearchRun[]; } catch { return []; }
}

export function saveRun(run: ResearchRun) {
  if (typeof window === "undefined") return;
  const existing = loadRuns();
  if (existing.some((x) => x.id === run.id)) return;
  localStorage.setItem(KEY, JSON.stringify([run, ...existing].slice(0, 100)));
}
