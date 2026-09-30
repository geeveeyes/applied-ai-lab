# HANDOFF — Equity Research Lab

> The baton. Read this first and update it last. Protocol: `AGENTS.md`.
> Notion mirror: 🧠 Venkat AI Hub → Project — Equity Research Lab → Handoff log.

**Current holder:** none. Open for Claude or Codex.
**Last updated:** 2026-09-30 by Claude
**Main at:** `2e26aed` (Show valuation inputs and clarify peer reference limitations)
**Baseline:** tsc clean · vitest 81/81 · build not re-run in review

## State

v0.9 engine is deployed at https://13-equity-research-lab.vercel.app (live mode, FMP + SEC + Alpha Vantage + OpenAI, Supabase archive).
It has research reports, a 6-factor investment decision, peer valuation for 13 hard-coded sectors, cited web briefs,
a holdings workspace, Portfolio Lab (Monte Carlo) and an AMZN decision workspace.
Codex paused on 2026-09-25 because of credit limits. Claude reviewed the project on 2026-09-30: `docs/REVIEW_2026-09-30_claude.md`.

## Next up (in order)

1. **P0 — lock down paid endpoints.** Add auth, make research a POST with a global daily cap, reuse same-day reports and add `robots.txt`. See review §P0.
2. Add CI (tsc, test, build) and a Prettier/ESLint format-only commit.
3. Consolidate to one scoring model, sync `SKILL.md` and remove the tautological `expectedReturn12m`.
4. Build a deterministic valuation module so "Buy candidate" is reachable on evidence.
5. Add point-in-time eval fixtures and the retrospective grading loop (historical prices + cron).

## Open questions for Venkat

- Auth approach: Vercel Deployment Protection (fastest, owner-only) or Supabase login (needed for cross-device archive)?
- Should the app stay public as a portfolio demo, perhaps in demo mode, while live mode is owner-only?
- Is there budget for an FMP plan upgrade, or should mid-cap coverage come from an SEC-only tier?

## Log

- **2026-09-30 · Claude.** Reviewed the codebase and added `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md` and `docs/REVIEW_2026-09-30_claude.md`. No product code changed.
- **2026-09-25 · Codex.** Last feature commit `2e26aed`: peer valuation inputs and reference limitations.
