"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadRuns } from "@/lib/archive";
import type { ResearchRun } from "@/lib/types";

export default function ResearchArchive() {
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  useEffect(() => setRuns(loadRuns()), []);
  return <section><p className="eyebrow">SAVED SNAPSHOTS</p><h1>Research archive</h1><p className="lede">Reports are saved in this browser. Open a ticker below to review its saved report without rerunning research. Clearing browser storage removes these snapshots.</p>{runs.length === 0 ? <div className="panel">No snapshots yet. Run a ticker analysis first.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Ticker</th><th>Verdict</th><th>Score</th><th>Confidence</th><th>12m sensitivity range</th></tr></thead><tbody>{runs.map(r => <tr key={r.id}><td>{new Date(r.analyzedAt).toLocaleDateString()}</td><td><Link prefetch={false} href={`/research/${encodeURIComponent(r.id)}`}>{r.ticker}</Link></td><td>{r.verdict}</td><td>{r.score}</td><td>{r.confidence}%</td><td>{r.scenarios.length ? `${r.expectedReturn12m.low}% → ${r.expectedReturn12m.high}%` : "Unavailable"}</td></tr>)}</tbody></table></div>}</section>;
}
