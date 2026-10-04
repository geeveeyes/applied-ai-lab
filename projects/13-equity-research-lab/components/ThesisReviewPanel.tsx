import React from 'react';
import type { ResearchRun } from '../lib/types';
import { thesisReviewStatus } from '../lib/thesis-review';

export function ThesisReviewPanel({ run }: { run: ResearchRun }) {
  const review = run.thesisReview;
  return <section className="panel">
    <p className="eyebrow">REVISIT THE INVESTMENT CASE</p>
    <h2>What would change this view?</h2>
    <p>{thesisReviewStatus(run)}</p>
    <p className="muted">Review conditions are research judgments. A date becoming due asks you to revisit the evidence; it does not mean the investment has failed. Linked sources have been checked for membership in this report, not independently verified for truth.</p>
    {review?.checks.length ? review.checks.map((check, i) => <article key={i}>
      <h3>{check.question || `Check ${i + 1}`}</h3>
      <p><strong>Evidence:</strong> {check.observation}{check.evidenceDate ? ` (${check.evidenceDate})` : ''}</p>
      <p><strong>Reconsider if:</strong> {check.reviewCondition || 'No observable condition supplied.'}</p>
      <p><strong>Next review:</strong> {check.reviewBy ? `${check.reviewBy} · ${check.dateBasis === 'Planning assumption' ? 'suggested date' : 'reported event date'}` : 'Date not established'}</p>
      {check.sources.length > 0 && <p>{check.sources.map((url, n) => <span key={url}><a href={url} target="_blank" rel="noopener noreferrer">Source {n + 1}</a>{n < check.sources.length - 1 ? ' · ' : ''}</span>)}</p>}
      {check.warnings.length > 0 && <p className="muted">{check.warnings.join(' ')}</p>}
    </article>) : <p>This saved report has no dated checks. Its original conclusions are preserved. Generate a new full report when you need an updated investment case.</p>}
    {!!review?.gaps.length && <><h3>Information still needed</h3><ul>{review.gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul></>}
  </section>;
}
