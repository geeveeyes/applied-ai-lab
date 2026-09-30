# HANDOFF — Equity Research Lab

> The baton. Read this first and update it last. Protocol: `AGENTS.md`.
> Notion mirror: 🧠 Venkat AI Hub → Project — Equity Research Lab → Handoff log.

**Current holder:** none. Branch `claude/p0-lockdown-and-valuation` awaits Venkat's push + PR (Claude's cloud session cannot push).
**Last updated:** 2026-09-30 (later) by Claude
**Main at:** `ab60249` (handoff docs, PR #1). Work branch: `claude/p0-lockdown-and-valuation` (6 commits on top).
**Baseline (branch):** tsc clean · vitest 106/106 · `npm run build` passes

## State

v0.9 engine is deployed at https://13-equity-research-lab.vercel.app (live mode, FMP + SEC + Alpha Vantage + OpenAI, Supabase archive).
It has research reports, a 6-factor investment decision, peer valuation for 13 hard-coded sectors, cited web briefs,
a holdings workspace, Portfolio Lab (Monte Carlo) and an AMZN decision workspace.
Codex paused on 2026-09-25 because of credit limits. Claude reviewed the project on 2026-09-30: `docs/REVIEW_2026-09-30_claude.md`.


**2026-09-30 Claude session 2 (branch, not yet merged):**
- **Vercel:** Deployment Protection switched from *Standard* (which left the production URL public) to **All Deployments**. The live app now requires a Vercel login on the team. Done in the dashboard, no code.
- **P0 code guard:** `/company/[ticker]` no longer runs research on GET (shows today's saved report or a Run button). `/api/analyze` is POST-only + same-origin. Global daily cap on new live reports (`RESEARCH_DAILY_CAP`, default 15, counted from saved snapshots, fails closed without DB). Same-day same-ticker reuse. Opportunities screen uses POST and stops at the cap. `robots.txt` + `X-Robots-Tag: noindex`.
- **Valuation:** `lib/intrinsic-valuation.ts` deterministic DCF (FCF, or net income when capex > 60% of OCF; consensus revenue CAGR clamped −5..25% fading to 2.5%; 10/9/8% discount; + net cash from SEC). Excludes banks/insurers; caps cyclicals and no-forecast cases. `lib/valuation-factor.ts` sets the valuation factor in code (more conservative of DCF vs complete peer table). Scenarios are now intrinsic bear/base/bull, not price-anchored. Engine v0.10.0.
- **Diversification:** holdings page gets a concentration check (single-stock/sector limits, trim-to-limit $, effective # of stocks, top-5).
- **Learn loop (v1):** `/performance` grades frozen reports against later saved reports of the same ticker (30/90/180/365d). Zero API cost.
- **CI:** `.github/workflows/equity-research-lab.yml` (tsc, test, build).

## Next up (in order)

1. **Venkat:** push `claude/p0-lockdown-and-valuation`, open PR, merge when CI is green. Optionally set `RESEARCH_DAILY_CAP` in Vercel (default 15).
2. Sanity-check the DCF on 3–5 live reports (AMZN, MSFT, PG, XOM, JPM should show "not valued"). Tune `POLICY` in `lib/intrinsic-valuation.ts` only with written rationale.
3. Consolidate to one scoring model: delete the 12-dimension scorecard/`deterministicConfidence` path, rename `expectedReturn12m` (now DCF gap, unused in UI), sync `skills/equity-research/SKILL.md`.
4. Prettier/ESLint format-only commit (dense one-line files hurt cross-agent diffs).
5. Learn loop v2: benchmark (SPY) + dividends via historical prices and a Vercel Cron that re-snapshots followed tickers monthly within the budget.
6. Point-in-time LLM eval fixtures (`evals/`).

## Open questions for Venkat

- ~~Auth approach~~ **Decided:** Vercel Deployment Protection, now set to All Deployments (2026-09-30).
- Is 15 new live reports/day the right cap? (Screen of 10 + a few single reports.)
- Keep a public demo-mode showcase? It would need a separate Vercel project, since protection now covers all deployments.
- FMP plan upgrade vs an SEC-only tier for mid-caps?

## Log

- **2026-09-30 · Claude (session 2).** Vercel protection → All Deployments. Branch `claude/p0-lockdown-and-valuation`: P0 cost guard, deterministic DCF valuation, diversification check, zero-cost track record, CI. 106 tests. Not pushed (session lacks repo push access); delivered as patch series.
- **2026-09-30 · Claude.** Reviewed the codebase and added `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md` and `docs/REVIEW_2026-09-30_claude.md`. No product code changed.
- **2026-09-25 · Codex.** Last feature commit `2e26aed`: peer valuation inputs and reference limitations.
