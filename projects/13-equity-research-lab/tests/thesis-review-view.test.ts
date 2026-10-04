import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ThesisReviewPanel } from '../components/ThesisReviewPanel';
import { validateThesisReview } from '../lib/thesis-review';
import type { Citation, ResearchRun } from '../lib/types';
it('renders dated evidence, proposed conditions and source links without an automatic verdict', () => {
  const url = 'https://issuer.example/results';
  const thesisReview = validateThesisReview({ checks: [{ question: 'Is cash sustainable?', observation: 'Cash generation was positive.', reviewCondition: 'Revisit if spending outpaces cash generation.', evidenceDate: '2026-09-01', sources: [url], reviewBy: '2026-10-15', dateBasis: 'Planning assumption' }], gaps: ['Next reported quarter'] }, [{ url }] as Citation[], '2026-10-04');
  const html = renderToStaticMarkup(React.createElement(ThesisReviewPanel, { run: { analyzedAt: '2026-10-04', thesisReview } as ResearchRun }));
  expect(html).toContain('2026-09-01'); expect(html).toContain('suggested date'); expect(html).toContain(`href="${url}"`);
  expect(html).toContain('Information still needed'); expect(html).toContain('does not mean the investment has failed');
});
it('shows a useful legacy-report state without rewriting historical conclusions', () => {
  const html = renderToStaticMarkup(React.createElement(ThesisReviewPanel, { run: { analyzedAt: '2026-10-04' } as ResearchRun }));
  expect(html).toContain('original conclusions are preserved'); expect(html).toContain('Dated checks unavailable');
});
