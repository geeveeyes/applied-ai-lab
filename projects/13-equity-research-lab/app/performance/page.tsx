"use client";
import { useEffect, useMemo, useState } from "react";
import { loadRuns } from "@/lib/archive";
import type { ResearchRun } from "@/lib/types";

export default function Performance() {
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  useEffect(() => setRuns(loadRuns()), []);
  const unique = useMemo(() => new Set(runs.map(r => r.ticker)).size, [runs]);
  return <section><p className="eyebrow">RETROSPECTIVE ENGINE</p><h1>Prediction performance</h1><p className="lede">This is the audit trail: compare the frozen prediction against 30d, 90d, 180d and 365d realized returns without letting future information rewrite the original thesis.</p><div className="scenario-grid"><div className="metric"><strong>{runs.length}</strong><span>snapshots</span></div><div className="metric"><strong>{unique}</strong><span>companies</span></div><div className="metric"><strong>4</strong><span>review horizons</span></div></div><div className="panel"><h2>Next implementation step</h2><p>Connect a historical-price provider and a scheduled evaluator. The scoring function is already covered by tests in <code>tests/scoring.test.ts</code>.</p></div></section>;
}
