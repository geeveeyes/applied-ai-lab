'use client';
import { useState } from 'react';
import Link from 'next/link';
import { diversification, DEFAULT_LIMITS } from '@/lib/diversification';
import { dollars, percent, type Holdings } from '@/lib/holdings';

export function DiversificationPanel({ holdings }: { holdings: Holdings }) {
  const [single, setSingle] = useState(DEFAULT_LIMITS.singleStock * 100), [sector, setSector] = useState(DEFAULT_LIMITS.sector * 100);
  if (!(holdings.totalValue > 0) || !holdings.positions.length) return null;
  const d = diversification(holdings, { singleStock: single / 100, sector: sector / 100 });
  return <section className="panel">
    <p className="eyebrow">DIVERSIFICATION CHECK</p>
    <h2>{d.verdict}</h2>
    <p>Individual stocks {percent(d.stockWeight)} · funds/ETFs {percent(d.fundWeight)} · cash {percent(d.cashWeight)}.{d.largest && <> Largest stock: <strong>{d.largest.symbol} {percent(d.largest.weight)}</strong>.</>} Top five stocks {percent(d.top5Weight)}.{d.effectiveHoldings !== null && <> Effective number of direct stocks: <strong>{d.effectiveHoldings}</strong> (weights normalized within direct stocks; cash and funds excluded).</>}</p>
    <div className="input-grid"><label>Single-stock limit (%)<input type="number" min="1" max="100" value={single} onChange={e => setSingle(Number(e.target.value) || 10)} /></label><label>Sector limit (%)<input type="number" min="5" max="100" value={sector} onChange={e => setSector(Number(e.target.value) || 30)} /></label></div>
    {d.flags.length ? <ul>{d.flags.map(f => <li key={f}>{f}</li>)}</ul> : <p>No position or known sector exceeds your limits.</p>}
    {d.sectors.length > 0 && <div className="table-wrap"><table><thead><tr><th>Sector (known names)</th><th>Weight</th></tr></thead><tbody>{d.sectors.map(s => <tr key={s.sector}><td>{s.sector}{s.overLimit ? ' ⚠' : ''}</td><td>{percent(s.weight)}</td></tr>)}</tbody></table></div>}
    {d.positions.some(p => p.overLimit) && <p>Over-limit positions: {d.positions.filter(p => p.overLimit).map(p => `${p.symbol} (trim ≈ ${dollars(p.trimToLimit)})`).join(', ')}. Compare allocation outcomes in the <Link href="/portfolio">Portfolio Lab</Link> or run trim ratios for the largest holding in the <Link href={`/amzn?symbol=${encodeURIComponent(d.positions.find(p=>p.overLimit)!.symbol)}`}>holding diversification tool</Link>.</p>}
    <p className="muted">Deterministic arithmetic on your saved snapshot. Fund underlying holdings and overlap are not included; sector labels cover only names with a configured sector. Not tax or investment advice.</p>
  </section>;
}
