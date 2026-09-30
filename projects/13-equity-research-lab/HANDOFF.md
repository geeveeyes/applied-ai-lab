# HANDOFF — Equity Research Lab

> The baton. Read this first and update it last. Protocol: `AGENTS.md`.
> Notion mirror: 🧠 Venkat AI Hub → Project — Equity Research Lab → Handoff log.

**Current holder:** none. Codex review completed on `codex/shared-tool-review`; PR delivery pending final CI/merge.
**Last updated:** 2026-09-30 by Codex
**Main reviewed:** `50439a1` (PR #3, first eight Claude session-3 commits).
**Latest code commit:** `855b8de` (atomic provider usage reservations), following `a4fa055` (decision/valuation correctness).
**Validation:** 144 tests passed; type check and production build passed. Full final checks repeated before publishing.

## State

**Current delivery (Codex):** recovered Claude's missing four commits from `equity-part2-import-scoring-backtest.mbox`, preserving authorship. Branch includes broker CSV import, one scoring model and the exploratory backtest. Engine v0.12.0 fixes the 15% margin, stale/unsupported quick-check signals, full-report priority, partial CSV coverage and cash-flow convention. Provider calls now reserve attempts atomically before work; failures count. No database migration required. Review: `docs/REVIEW_2026-09-30_codex.md`. Older dated entries below describe prior states.


v0.9 engine is deployed at https://13-equity-research-lab.vercel.app (live mode, FMP + SEC + Alpha Vantage + OpenAI, Supabase archive).
It has research reports, a 6-factor investment decision, peer valuation for 13 hard-coded sectors, cited web briefs,
a holdings workspace, Portfolio Lab (Monte Carlo) and an AMZN decision workspace.
Codex paused on 2026-09-25 because of credit limits. Claude reviewed the project on 2026-09-30: `docs/REVIEW_2026-09-30_claude.md`.


**Session 3b (same branch):** broker CSV import (Fidelity/Schwab/Vanguard/generic, `lib/broker-import.ts`); one scoring model (AI no longer asked for the unused 12-dimension scorecard → fewer tokens per report; `run.score` = six-factor score; SKILL.md rewritten, engine v0.11.0); point-in-time backtest of DCF zones at `/backtest` (`lib/backtest.ts`, SEC facts filed-by-date + actual price, 12m excess vs SPY).

**2026-09-30 Claude session 3 (branch `claude/quick-check-watchlist`, not merged).** Steering from Venkat: personal portfolio decisions first; a generic tool is the future vision (see `docs/PRODUCT_STRATEGY.md`).
- **Quick check** (`lib/quick-check.ts`, `/api/quick-check`): AI-free DCF snapshot, zone (Buy zone ≥15% margin / Fair / Expensive / Not valued), buy-below price. Metered by `QUICK_CHECK_DAILY_CAP` (default 60) in `equity_provider_usage` (no migration), cached per ticker per day.
- **Watchlist** (`/watchlist`): browser-private list, check all, ranked table, diversification ideas for sectors not held.
- **Position decisions** (`lib/position-advice.ts`) on /holdings: ordered rules (concentration > recent full report > quick-check zone) → Trim to limit / Review selling / Trim candidate / Hold / Hold, don't add / Add candidate; optional average cost → tax note. Reprice holdings from today's checks. **Decision journal** graded against later prices.
- **Find stocks** is quick-screen first (10 or ~45 names), full reports for finalists. Report shows buy-below + DCF sensitivity grid. Home page is portfolio-first. Report holding panel limit 20%→10%.

**2026-09-30 Claude session 2 (merged as PR #2):**
- **Vercel:** Deployment Protection switched from *Standard* (which left the production URL public) to **All Deployments**. The live app now requires a Vercel login on the team. Done in the dashboard, no code.
- **P0 code guard:** `/company/[ticker]` no longer runs research on GET (shows today's saved report or a Run button). `/api/analyze` is POST-only + same-origin. Global daily cap on new live reports (`RESEARCH_DAILY_CAP`, default 15, counted from saved snapshots, fails closed without DB). Same-day same-ticker reuse. Opportunities screen uses POST and stops at the cap. `robots.txt` + `X-Robots-Tag: noindex`.
- **Valuation:** `lib/intrinsic-valuation.ts` deterministic DCF (FCF, or net income when capex > 60% of OCF; consensus revenue CAGR clamped −5..25% fading to 2.5%; 10/9/8% discount; + net cash from SEC). Excludes banks/insurers; caps cyclicals and no-forecast cases. `lib/valuation-factor.ts` sets the valuation factor in code (more conservative of DCF vs complete peer table). Scenarios are now intrinsic bear/base/bull, not price-anchored. Engine v0.10.0.
- **Diversification:** holdings page gets a concentration check (single-stock/sector limits, trim-to-limit $, effective # of stocks, top-5).
- **Learn loop (v1):** `/performance` grades frozen reports against later saved reports of the same ticker (30/90/180/365d). Zero API cost.
- **CI:** `.github/workflows/equity-research-lab.yml` (tsc, test, build).

## Next up (in order)

1. Merge the shared review PR only after type check, 144 tests and build pass; verify protected deployment. No subscription upgrades or trades.
2. Source-date verification and fixed full-report evaluations, including missing/adverse evidence cases.
3. Improve cash-flow forecasts, reinvestment/dilution and sector-specific valuation; validate thresholds rather than maximizing Buy labels.
4. Fund look-through/AMZN overlap and portfolio completeness, then tax-lot-aware adjustments.
5. Prospective outcome tracking plus a broader, audited point-in-time benchmark study. The current exploratory backtest is not proof of predictive accuracy.
6. Browser-data export/recovery and a separate dependency-maintenance PR for the known Next/postcss advisory.

## Open questions for Venkat

- ~~Auth~~ Decided: Vercel Deployment Protection, All Deployments. ~~Daily cap~~ Set to 5 by Venkat (2026-09-30).
- Are the 10% single-stock / 30% sector defaults right for you? (Editable per session on /holdings.)
- Is a 15% margin of safety the right "buy zone" threshold?
- Generic-tool direction: see `docs/PRODUCT_STRATEGY.md`. The narrow candidate is an educational concentration planner for stock-comp employees.
- FMP plan upgrade vs an SEC-only tier for mid-caps?

## Log

- **2026-09-30 · Codex shared review.** Reviewed `50439a1` and Notion; recovered four missing Claude commits (134 baseline tests). Corrected decision/valuation regressions and added atomic usage reservations. Final suite 144 tests; reviewed math against CFA/Damodaran cash-flow conventions. Branch `codex/shared-tool-review`; code at `855b8de`. No claims of proven investment returns. See Codex review for remaining gaps.

- **2026-09-30 · Claude (session 3b).** Broker CSV import, one scoring model, zone backtest. 134 tests. Branch not pushed (session lacks push access).
- **2026-09-30 · Claude (session 3).** Branch `claude/quick-check-watchlist`: AI-free quick checks, watchlist, per-holding decisions, decision journal, quick-screen, sensitivity grid, portfolio-first home, product strategy doc. 123 tests. Not pushed; delivered as patch series.
- **2026-09-30 · Claude (session 2).** Vercel protection → All Deployments. Branch `claude/p0-lockdown-and-valuation`: P0 cost guard, deterministic DCF valuation, diversification check, zero-cost track record, CI. 106 tests. Not pushed (session lacks repo push access); delivered as patch series.
- **2026-09-30 · Claude.** Reviewed the codebase and added `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md` and `docs/REVIEW_2026-09-30_claude.md`. No product code changed.
- **2026-09-25 · Codex.** Last feature commit `2e26aed`: peer valuation inputs and reference limitations.
