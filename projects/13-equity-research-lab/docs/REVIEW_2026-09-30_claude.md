# Code & product review — 2026-09-30 (Claude)

Reviewed at `2e26aed`. Baseline: `npm ci`, `vitest` 81/81 pass, `tsc --noEmit` clean.
Live site not exercised from the review sandbox; exposure findings are from code.

## P0 — Public cost exposure

**Anonymous GETs trigger paid OpenAI runs.** `app/company/[ticker]/page.tsx` and `GET /api/analyze`
call `runResearch()` on every request: a web-search brief (≤6 tool calls, 5.5k output tokens) plus a
medium-reasoning synthesis, then insert a snapshot.

- No authentication, no global cap on synthesis, no per-ticker/day reuse of the synthesis (only the web brief is cached for 1h).
- The home page has plain `<a href="/company/NVDA">` links and there is no `robots.txt`. Crawlers and link unfurlers (Slack, iMessage) will trigger runs.
- `middleware.ts` issues a new workspace cookie to any cookieless request, so per-workspace limits don't protect anything.
- A page refresh runs a new paid report.

**Fix (order):** (1) put the whole app behind auth (Vercel Deployment Protection or a single-owner Supabase login) today;
(2) make research a `POST` with `sameOrigin()` and a global daily synthesis cap (reuse the `equity_claim_web_research` RPC pattern);
(3) reuse same-day same-ticker reports unless "force refresh"; (4) `robots.txt` disallow all; (5) have `/company/[ticker]`
start a job and redirect to `/research/[id]` instead of rendering a 200+ second synchronous run.

## P1 — Core product claims aren't real yet

1. **The "Learn" loop doesn't exist.** `retrospectiveGrade()` is never called. `/performance` is a placeholder. There's
   no historical-price provider and no scheduler. This is the project's stated differentiator (ROADMAP #13).
2. **Scenarios are tautological.** Base = today's price by construction. Bull/bear = ±20% P/E × EPS range, which gives roughly
   ±30% for every stock (live review: NVDA −36/+33, GOOGL −28/+32, MSFT −28/+32). `expectedReturn12m` is derived from these ranges.
   If retrospective grading gets wired up, it will grade against a meaningless range. Remove `expectedReturn12m` or feed it from a real valuation.
3. **The decision engine structurally can't say Buy.** Unknown valuation caps the score at 59. Valuation only counts with
   (a) a complete peer table, which needs 13 hard-coded groups (~40 tickers), 2 eligible peers inside date windows and a 24/day AV quote budget, or
   (b) an "independent cash-flow valuation", which the prompt forbids the model from producing. Result: almost everything is "Watch / wait".
   **Build a deterministic valuation module in code** (normalized-FCF DCF with explicit, displayed assumptions; forward EV/EBIT or P/E
   vs peers using consensus). The LLM should then critique the module's output, not be the valuation source.
4. **Two parallel scoring systems.** The 12-dimension scorecard and `deterministicConfidence` are computed, then overwritten
   by the 6-factor investment score and `assessDecisionEvidence`. `SKILL.md` still documents the 12-dimension model at v0.5.2, while the engine
   says v0.9.0. Pick one model, delete the other, and version them together.
5. **Evidence dates come from the model.** The LLM supplies `evidenceDate`. Validation checks only that the URL is in the
   catalog and that the *claimed* date is fresh, not that the source was published then. Capture publication dates from
   search-result metadata or filing metadata and cross-check.
6. **No LLM evals.** All 81 tests are deterministic. The three point-in-time fixtures in `evals/README.md` were never built.
   The ~1,300-word system prompt has accumulated patch rules and will regress silently without a golden set (this is a good fit with roadmap #05).

## P2 — Engineering hygiene (more important with two agents committing)

- **No CI.** Add a GitHub Action: `npm ci && npx tsc --noEmit && npm test && npm run build` on push/PR.
- **Dense one-line code** (`lib/portfolio/engine.ts`, `peer-valuation.ts`, `decision-evidence.ts`, `investment.ts`) makes diffs
  hard to review across agents. Add Prettier + ESLint and format once in a dedicated no-logic commit.
- `npm run lint` uses deprecated `next lint` and there is no ESLint config.
- `npm audit`: high-severity `postcss` through `next@15.5`. The fix needs Next 16 (breaking). Schedule it deliberately.
- **Undocumented env vars** in `.env.example`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `OPENAI_WEB_MODEL`, `RESEARCH_PRICING_JSON`.
  Without the last one, report cost always shows "unknown".
- **Version drift:** package.json 0.1.0, SKILL.md v0.5.2, engine v0.9.0, README sections v0.6–v0.8. Move release notes to `CHANGELOG.md`.
- **Coverage is limited to mega-caps** by the FMP plan (CROX/DECK/IBM fail). Consider an SEC-only analysis tier so non-covered names still get a useful report.
- `001_init.sql` is a legacy unused schema. Mark it as such or drop it.

## Recommended next iterations

| # | Iteration | Size | Owner suggestion |
|---|-----------|------|------------------|
| 1 | P0 lockdown (auth, POST, caps, same-day reuse, robots) | ½ day | Whoever picks up next |
| 2 | CI + Prettier/ESLint format-only commit | ½ day | Either |
| 3 | Consolidate to one scoring model; sync SKILL.md; drop `expectedReturn12m` | 1 day | Either |
| 4 | Deterministic valuation module + LLM critique | 2–3 days | Claude |
| 5 | Point-in-time eval fixtures + retrospective loop (historical prices + Vercel Cron) | 2–3 days | Codex |
