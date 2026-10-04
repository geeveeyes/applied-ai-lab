import { describe, expect, it } from 'vitest';
import { researchQuestions, thesisReviewStatus, validDate, validateThesisReview, type ThesisReviewInput } from '../lib/thesis-review';
import type { Citation, ResearchRun } from '../lib/types';
const citations = [{ url: 'https://issuer.example/results' }] as Citation[];
const input = (): ThesisReviewInput => ({ gaps: [], checks: [{ question: 'Cash generation', observation: 'Reported cash rose 10%.', reviewCondition: 'Revisit if spending outpaces operating cash.', evidenceDate: '2026-09-01', sources: [citations[0].url], reviewBy: '2026-10-15', dateBasis: 'Planning assumption' }] });
const run = (review = validateThesisReview(input(), citations, '2026-10-04T00:00:00Z')) => ({ analyzedAt: '2026-10-04T00:00:00Z', thesisReview: review }) as ResearchRun;
describe('dated thesis checks', () => {
  it('keeps supported observations and marks suggested dates without mutating input', () => {
    const raw = input(); const before = JSON.stringify(raw);
    const result = validateThesisReview(raw, citations, '2026-10-04T00:00:00Z');
    expect(result.checks[0].evidenceStatus).toBe('Linked');
    expect(result.checks[0].dateBasis).toBe('Planning assumption');
    expect(JSON.stringify(raw)).toBe(before);
  });
  it.each(['2026-02-30', '2026-10-05', '', 'not a date'])('withholds observations with invalid, future or absent evidence dates: %s', date => {
    const raw = input(); raw.checks[0].evidenceDate = date;
    const result = validateThesisReview(raw, citations, '2026-10-04');
    expect(result.checks[0].evidenceStatus).toBe('Missing');
    expect(result.checks[0].observation).not.toContain('10%');
  });
  it.each(['javascript:alert(1)', 'https://unknown.example/claim', 'https://user:secret@issuer.example/results'])('removes unsupported or unsafe URLs: %s', url => {
    const raw = input(); raw.checks[0].sources = [url];
    const result = validateThesisReview(raw, citations, '2026-10-04');
    expect(result.checks[0].sources).toEqual([]);
    expect(result.checks[0].evidenceStatus).toBe('Missing');
  });
  it('does not accept an unsourced reported-event date or an unknown date basis', () => {
    const raw = input(); raw.checks[0].dateBasis = 'Reported event'; raw.checks[0].sources = [];
    expect(validateThesisReview(raw, citations, '2026-10-04').checks[0].reviewBy).toBe('');
    raw.checks[0].dateBasis = 'Unknown';
    expect(validateThesisReview(raw, citations, '2026-10-04').checks[0].reviewBy).toBe('');
  });
  it('counts a due review on its UTC date without claiming that the thesis failed', () => {
    expect(thesisReviewStatus(run(), new Date('2026-10-14T23:59:59Z'))).toBe('Checks available');
    expect(thesisReviewStatus(run(), new Date('2026-10-15T00:00:00Z'))).toBe('1 review due');
  });
  it('preserves compatibility with old reports and exposes missing evidence', () => {
    expect(thesisReviewStatus({ analyzedAt: '2026-10-04' } as ResearchRun)).toBe('Dated checks unavailable');
    const raw = input(); raw.checks[0].sources = []; raw.checks[0].reviewBy = '';
    expect(thesisReviewStatus(run(validateThesisReview(raw, citations, '2026-10-04')), new Date('2026-10-04'))).toBe('1 evidence gap');
  });
  it('uses real calendar dates including leap years and flags old reports', () => {
    expect(validDate('2024-02-29')).toBe(true); expect(validDate('2025-02-29')).toBe(false);
    expect(thesisReviewStatus(run(), new Date('2026-12-01'))).toContain('Report over 30 days old');
  });
  it('routes company prompts without claiming a universal gate', () => {
    expect(researchQuestions('AMZN').join(' ')).toContain('AWS');
    expect(researchQuestions('JPM').join(' ')).toContain('credit');
    expect(researchQuestions('UNKNOWN')).toHaveLength(3);
  });
});
