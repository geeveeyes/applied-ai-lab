# Project Status

## Implemented in v0.1.0

- Reusable `skills/equity-research/SKILL.md`
- Next.js / TypeScript portal shell
- Ticker analysis route and UI
- 12-factor weighted research scorecard
- Bull/base/bear scenarios and thesis killers
- SEC company-facts provider
- FMP/TipRanks analyst provider boundary with sourced analyst calls
- Options-chain provider interface and strategy comparison UI
- Browser research archive for MVP use
- Supabase schema for persistent snapshots, claims and retrospectives
- Retrospective grading logic for prediction-vs-actual evaluation
- Core-logic smoke tests
- Vercel deployment metadata

## Validation completed

Core TypeScript research/scoring modules were compiled with TypeScript 5.8.3 and smoke-tested locally. Package installation / full Next.js build could not be completed in the current runtime because access to the npm registry timed out.

## Repository

This project lives at `projects/13-equity-research-lab/` inside `geeveeyes/applied-ai-lab`.

## Next milestones

1. Run `npm install`, `npm test`, and `npm run build` in an environment with npm access.
2. Connect Supabase persistence.
3. Add historical-price retrieval and scheduled retrospective grading.
4. Implement reverse DCF and richer fundamentals normalization.
5. Add live options chain / Greeks / IV analytics.
6. Deploy the project to Vercel.
