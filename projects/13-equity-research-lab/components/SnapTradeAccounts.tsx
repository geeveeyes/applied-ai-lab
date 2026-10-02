'use client';

import { useState } from 'react';
import Link from 'next/link';
import { accountAttention } from '@/lib/account-attention';
import { usePortfolioSession } from './PortfolioSession';
import type { ConnectedSnapshot } from '@/lib/connected-portfolio';

export function SnapTradeAccounts() {
  const { snapshot, setSnapshot } = usePortfolioSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/snaptrade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not refresh connected accounts.');
      setSnapshot(body as ConnectedSnapshot);
      setMessage('Account data refreshed. No research or trades were run.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not refresh connected accounts.');
    } finally { setBusy(false); }
  }

  return <section className="panel">
    <p>Refresh is manual. This page reads account types, reported totals, cash, holdings and update dates from SnapTrade. It makes no AI research calls and does not place trades. Keep the Vercel login gate enabled.</p>
    <button onClick={() => void refresh()} disabled={busy}>{busy ? 'Reading connected accounts…' : 'Refresh Fidelity and Robinhood'}</button>
    <p role="status">{message}</p>
    {!snapshot && <p className="muted">Your financial data stays off this page until you press refresh. It is held in this tab only and clears when you leave or reload.</p>}
    {snapshot && <>
      <p className="muted">Retrieved {dateTime(snapshot.retrievedAt)} · {snapshot.accounts.length} accounts shown · {snapshot.excludedAccountCount} accounts at other institutions skipped</p>
      {snapshot.accounts.length === 0 && <p>No Fidelity or Robinhood accounts were returned. Check the provider connection and refresh again.</p>}
      {snapshot.accounts.length > 0 && <section className="panel">
        <h2>Continue with this refresh</h2>
        <p>The same in-memory account data is now available across these tools in this tab. It clears when you reload or close the tab.</p>
        <div className="button-row"><Link className="action" href="/holdings">Open My holdings</Link><Link className="action secondary" href="/portfolio">Compare in Portfolio Lab</Link><Link className="action secondary" href="/amzn">Diversify a holding</Link></div>
      </section>}
      {snapshot.accounts.length > 0 && <section className="panel">
        <h2>What may need attention</h2>
        <p className="muted">These are account-by-account review flags from the snapshot above. They do not combine accounts, estimate fund holdings, or tell you to trade.</p>
        {snapshot.accounts.map((account, i) => {
          const review = accountAttention({
            institution: account.institution, name: account.name, reportedTotal: account.reportedTotal,
            positionsAvailable: account.positionsAvailable, positions: account.positions,
          });
          return <article key={`${review.accountLabel}-${i}`} className="panel">
            <h3>{review.accountLabel}</h3>
            {review.findings.map((finding, j) => <p key={j}>
              <strong>{finding.priority}: {finding.title}.</strong> {finding.detail}
            </p>)}
          </article>;
        })}
      </section>}
      <div className="table-wrap"><table><thead><tr><th>Institution / account</th><th>Type</th><th>Reported total</th><th>Cash</th><th>Holdings / freshness</th></tr></thead>
        <tbody>{snapshot.accounts.map((account, i) => <tr key={`${account.institution}-${account.name}-${i}`}>
          <td><strong>{account.institution}</strong><br />{account.name || 'Account name unavailable'}<br /><span className="muted">{account.status || 'Status unavailable'}</span></td>
          <td>{account.type || account.category || 'Type unavailable'}</td>
          <td>{money(account.reportedTotal?.amount, account.reportedTotal?.currency)}</td>
          <td>{account.cash?.length ? account.cash.map((row, j) => <div key={`${row.currency}-${j}`}>{money(row.amount, row.currency)}</div>) : 'Unavailable'}</td>
          <td>{account.positionsAvailable ? <>
            <strong>{account.positions?.length ?? 0} positions</strong>
            <div className="muted">Holdings data: {dateTime(account.positionsAsOf)}</div>
            <details><summary>Show holdings</summary>
              {account.positions?.length ? <ul>{account.positions.map((position, j) => <li key={`${position.symbol}-${j}`}>
                {position.symbol || position.description || 'Unidentified holding'} — {quantity(position.units)} units; {money(position.price, position.currency)} per unit
                {position.costBasis !== null ? `; cost basis ${money(position.costBasis, position.currency)} per unit` : '; cost basis unavailable'}
                {position.cashEquivalent ? '; cash equivalent (may already be included in cash)' : ''}
              </li>)}</ul> : <p>No positions returned. Check warnings before treating this as zero holdings.</p>}
            </details>
          </> : 'Holdings unavailable'}
            <div className="muted">Last provider sync: {dateTime(account.lastHoldingsSync)}</div>
            {account.warnings.map((warning, j) => <div key={j} role="note">{warning}</div>)}
          </td>
        </tr>)}</tbody></table></div>
      <p className="muted">Totals are reported by each brokerage. This page does not add accounts together, convert currencies, or estimate market values from units × price. Cash-equivalent holdings can overlap with cash.</p>
    </>}
  </section>;
}

function money(value: number | string | null | undefined, currency: string | null | undefined) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (amount === null || amount === undefined || !Number.isFinite(amount) || !currency) return 'Unavailable';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${amount.toLocaleString('en-US')} ${currency}`; }
}
function quantity(value: number | null) {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}
function dateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unavailable';
  return new Date(value).toLocaleString();
}
