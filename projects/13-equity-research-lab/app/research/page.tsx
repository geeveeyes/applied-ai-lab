"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadRuns } from "@/lib/archive";
import type { ResearchRun } from "@/lib/types";

export default function ResearchArchive() {
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  useEffect(() => setRuns(loadRuns()), []);
  return <section><p className="eyebrow">IMMUTABLE SNAPSHOTS</p><h1>Research archive</h1><p className="lede">Every company page you open is saved locally in this MVP. Production persistence is already modeled in the Supabase migration.</p>{runs.length === 0 ? <div className="panel">No snapshots yet. Run a ticker analysis first.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Ticker</th><th>Verdict</th><th>Score</th><th>Confidence</th><th>12m range</th></tr></thead><tbody>{runs.map(r => <tr key={r.id}><td>{new Date(r.analyzedAt).toLocaleDateString()}</td><td><Link href={`/company/${r.ticker}`}>{r.ticker}</Link></td><td>{r.verdict}</td><td>{r.score}</td><td>{r.confidence}%</td><td>{r.expectedReturn12m.low}% → {r.expectedReturn12m.high}%</td></tr>)}</tbody></table></div>}</section>;
}
