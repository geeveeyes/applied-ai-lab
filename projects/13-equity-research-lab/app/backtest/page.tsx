"use client";
import { useEffect, useState } from "react";
import { parseTickers, loadWatchlist } from "@/lib/watchlist";
import type { BacktestRow } from "@/lib/backtest";

type Result = { rows: BacktestRow[]; skipped: string[]; errors: string[]; summary: { zone: string; n: number; meanExcess?: number; medianExcess?: number; beatSpy?: number }[]; ranAt: string };
const KEY = "equity-backtest-v1";
const pct = (x?: number) => x == null ? "—" : `${x > 0 ? "+" : ""}${x.toFixed(1)}%`;

export default function Backtest() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { setInput(loadWatchlist().slice(0, 6).join(", ") || "MSFT, PG, V, UNP, ABBV, GD"); try { setResult(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { /* ignore */ } }, []);
  async function run() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/backtest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers: parseTickers(input).slice(0, 6) }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setResult(body); try { localStorage.setItem(KEY, JSON.stringify(body)); } catch { /* quota */ }
    } catch (e) { setError(e instanceof Error ? e.message : "Backtest failed."); } finally { setBusy(false); }
  }
  return <section>
    <p className="eyebrow">BACKTEST · VALUATION ZONES</p><h1>Did &quot;Buy zone&quot; calls beat the market?</h1>
    <p className="lede">For every January since 2015, the app&apos;s DCF is re-run using only SEC facts filed by that date and the actual price then, and the next 12 months&apos; total return is compared with SPY. No AI credits; uses the shared Alpha Vantage history allowance (one call per new ticker plus SPY, cached for a day).</p>
    <div className="toolbar"><label>Up to 6 tickers<input value={input} onChange={e => setInput(e.target.value)} /></label><button disabled={busy} onClick={() => void run()}>{busy ? "Running… (up to 3 minutes)" : "Run backtest"}</button></div>
    {error && <p role="alert">{error}</p>}
    {result && <>
      <div className="table-wrap"><table><thead><tr><th>Zone at the time</th><th>Observations</th><th>Mean 12-month excess vs SPY</th><th>Median excess</th><th>Beat SPY</th></tr></thead>
        <tbody>{result.summary.map(s => <tr key={s.zone}><td>{s.zone}</td><td>{s.n}</td><td>{pct(s.meanExcess)}</td><td>{pct(s.medianExcess)}</td><td>{s.beatSpy == null ? "—" : `${Math.round(s.beatSpy * 100)}%`}</td></tr>)}</tbody></table></div>
      <p className="muted">What would validate the model: Buy zone clearly ahead of Expensive on both mean and median, with enough observations (dozens, not a handful). A few tickers over ten years is anecdote, not proof. Run {new Date(result.ranAt).toLocaleString()}.</p>
      <details><summary>{result.rows.length} observations{result.skipped.length ? `, ${result.skipped.length} skipped` : ""}{result.errors.length ? `, ${result.errors.length} errors` : ""}</summary>
        {result.errors.length > 0 && <ul>{result.errors.map(e => <li key={e}>{e}</li>)}</ul>}
        <div className="table-wrap"><table><thead><tr><th>Ticker</th><th>Date</th><th>Price then</th><th>Zone</th><th>Upside then</th><th>Trailing growth</th><th>12m return</th><th>SPY</th><th>Excess</th></tr></thead>
          <tbody>{result.rows.map(r => <tr key={`${r.ticker}${r.date}`}><td>{r.ticker}</td><td>{r.date}</td><td>${r.price.toFixed(2)}</td><td>{r.zone}</td><td>{pct(r.upsidePct)}</td><td>{pct(r.growthPct)}</td><td>{pct(r.returnPct)}</td><td>{pct(r.spyReturnPct)}</td><td>{pct(r.excessPct)}</td></tr>)}</tbody></table></div>
        {result.skipped.length > 0 && <ul>{result.skipped.map(s => <li key={s}><small>{s}</small></li>)}</ul>}
      </details>
    </>}
    <p className="muted">Method limits: growth uses trailing 3-year revenue CAGR (historical analyst forecasts are not available point-in-time); survivorship bias (you pick tickers that exist today); annual sampling; ignores taxes and costs.</p>
  </section>;
}
