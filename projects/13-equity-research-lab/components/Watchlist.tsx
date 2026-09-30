'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addToWatchlist, gapIdeas, loadChecks, loadWatchlist, parseTickers, runChecks, saveWatchlist } from '@/lib/watchlist';
import { rankChecks, MARGIN_OF_SAFETY, type QuickCheck } from '@/lib/quick-check';
import { readHoldings, type Holdings } from '@/lib/holdings';

const money = (n?: number) => n == null ? '—' : `$${n.toFixed(2)}`;
const pct = (n?: number) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);

export function Watchlist() {
  const [list, setList] = useState<string[]>([]);
  const [checks, setChecks] = useState<Record<string, QuickCheck>>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const stop = useRef(false);
  useEffect(() => { setList(loadWatchlist()); setChecks(loadChecks()); try { setHoldings(readHoldings()); } catch { /* ignore */ } }, []);

  function update(next: string[]) { saveWatchlist(next); setList(loadWatchlist()); }
  async function check(tickers: string[]) {
    setBusy(true); stop.current = false;
    await runChecks(tickers, msg => { setMessage(msg); setChecks(loadChecks()); }, stop);
    setChecks(loadChecks()); setBusy(false);
  }
  const stale = list.filter(t => !checks[t] || !checks[t].checkedAt.startsWith(today()));
  const rows = useMemo(() => rankChecks(list.map(t => checks[t]).filter(Boolean)), [list, checks]);
  const ideas = useMemo(() => gapIdeas(holdings), [holdings]);
  const held = new Set(holdings?.positions.filter(p => p.shares > 0).map(p => p.symbol) ?? []);

  return <>
    <section className="hero compact"><div>
      <p className="eyebrow">WATCHLIST · QUICK CHECK</p><h1>What is worth buying, and at what price?</h1>
      <p className="lede">Quick checks value every company on your list from SEC filings, the current price and consensus forecasts using the app&apos;s deterministic DCF. No AI credits are used. Run a full research report before acting on a candidate.</p>
    </div></section>
    <section className="panel">
      <div className="toolbar"><label>Add tickers (comma or space separated)<input value={input} placeholder="MSFT, V, PG" onChange={e => setInput(e.target.value)} /></label>
        <button onClick={() => { update([...list, ...parseTickers(input)]); setInput(''); }}>Add</button>
        {holdings && <button className="action secondary" onClick={() => update([...list, ...holdings.positions.filter(p => p.kind === 'stock').map(p => p.symbol)])}>Add my stock holdings</button>}</div>
      <div className="button-row">
        <button disabled={busy || !stale.length} onClick={() => void check(stale)}>{busy ? 'Checking…' : `Check ${stale.length} not checked today`}</button>
        {busy && <button className="action secondary" onClick={() => { stop.current = true; }}>Stop</button>}
      </div>
      <p role="status">{message}</p>
    </section>
    {rows.length > 0 && <section><div className="table-wrap"><table>
      <thead><tr><th>Company</th><th>Zone</th><th>Price</th><th>Intrinsic (bear · base · bull)</th><th>Buy below</th><th>Upside</th><th>Growth</th><th>FCF margin</th><th>Net cash / mkt cap</th><th>From 52w high</th><th></th></tr></thead>
      <tbody>{rows.map(c => <tr key={c.ticker}>
        <td><strong>{c.ticker}</strong>{held.has(c.ticker) ? ' · owned' : ''}<br /><small className="muted">{c.sector} · {c.checkedAt.slice(0, 10)}</small></td>
        <td>{c.zone}</td><td>{money(c.price)}</td>
        <td>{c.valuation.available ? `${money(c.valuation.perShare.bear)} · ${money(c.valuation.perShare.base)} · ${money(c.valuation.perShare.bull)}` : <small>{c.valuation.note}</small>}</td>
        <td>{money(c.buyBelow)}</td><td>{pct(c.upsidePct)}</td><td>{pct(c.metrics.consensusRevenueGrowth)}</td><td>{pct(c.metrics.fcfMargin)}</td><td>{pct(c.metrics.netCashToMarketCap)}</td><td>{pct(c.metrics.offYearHighPct)}</td>
        <td><a href={`/company/${encodeURIComponent(c.ticker)}`}>Full report</a>{' '}<button aria-label={`Remove ${c.ticker}`} onClick={() => update(list.filter(t => t !== c.ticker))}>✕</button>{c.flags.length > 0 && <details><summary>{c.flags.length} caveat{c.flags.length > 1 ? 's' : ''}</summary><ul>{c.flags.map(f => <li key={f}><small>{f}</small></li>)}</ul></details>}</td>
      </tr>)}</tbody></table></div>
      <p className="muted">Buy zone = price at least {MARGIN_OF_SAFETY * 100}% below the base intrinsic value (&quot;buy below&quot; = base ÷ {1 + MARGIN_OF_SAFETY}). Fair value range = within −10% to +{MARGIN_OF_SAFETY * 100}%. Intrinsic values use one transparent model and are not price targets; banks and insurers are not valued this way.</p>
    </section>}
    {list.filter(t => !checks[t]).length > 0 && <p className="muted">Not yet checked: {list.filter(t => !checks[t]).join(', ')}</p>}
    {ideas.length > 0 && <section className="panel"><h2>Ideas to diversify</h2>
      <p>{holdings ? 'Sectors where your saved holdings have no stock exposure' : 'Add your holdings to tailor this list. Configured sectors'} and example large companies to evaluate. Examples, not recommendations.</p>
      <ul>{ideas.map(i => <li key={i.sector}><strong>{i.sector}:</strong> {i.symbols.join(', ')}{' '}<button className="action secondary" onClick={() => { addToWatchlist(i.symbols); setList(loadWatchlist()); }}>Add to watchlist</button></li>)}</ul>
    </section>}
  </>;
}
