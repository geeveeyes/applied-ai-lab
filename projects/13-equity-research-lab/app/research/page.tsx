"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadArchive } from "@/lib/archive";
import type { ResearchRun } from "@/lib/types";

export default function ResearchArchive() {
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [message, setMessage] = useState("Loading archive…");
  useEffect(() => { loadArchive().then(result => { setRuns(result.runs); setMessage(result.message); }); }, []);
  return <section><p className="eyebrow">SAVED SNAPSHOTS</p><h1>Research archive</h1><p className="lede">Cloud reports are private to this browser’s workspace. Reopening a report preserves its original prices and evidence. Keep this site’s cookies to retain access; cross-device sign-in is not enabled.</p><p role="status">{message}</p>{message === "Loading archive…" ? null : runs.length === 0 ? <div className="panel">No snapshots yet. Run a ticker analysis first.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Ticker</th><th>Saved in</th><th>Verdict</th><th>Score</th><th>Confidence</th><th>12m sensitivity range</th></tr></thead><tbody>{runs.map(r => <tr key={r.id}><td>{new Date(r.analyzedAt).toLocaleDateString()}</td><td><Link prefetch={false} href={`/research/${encodeURIComponent(r.id)}`}>{r.ticker}</Link></td><td>{r.storage === "cloud" ? "Cloud" : "Browser"}</td><td>{r.verdict}</td><td>{r.score}</td><td>{r.confidence}%</td><td>{r.scenarios.length ? `${r.expectedReturn12m.low}% → ${r.expectedReturn12m.high}%` : "Unavailable"}</td></tr>)}</tbody></table></div>}</section>;
}
