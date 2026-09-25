# Project Status

## v0.6.0 — private durable research and end-of-day fallback

Supabase stores immutable server-generated reports in private browser workspaces.
Alpha Vantage supplies end-of-day quotes when FMP fails, with a six-hour persistent
cache and atomic 24-call daily cap. Archive reads do not rerun research. Legacy
browser copies remain available. Database failures fall back visibly to browser storage.

Production migration applied and RLS/public-access restrictions verified on 2026-09-25.
Live NVDA, AMZN, GOOGL, MSFT and NBIS reports saved successfully. NBIS now has a
verified Alpha Vantage price and SEC-backed partial analysis; missing forecasts still
withhold scenarios and cap confidence. Saved report equality and cross-workspace
404s verified for all four FMP sample reports; browser archive reopening verified for NBIS.
30 automated tests and production build/type checks passed.

## Prior v0.5.2 research controls

Deterministic evidence confidence and scenario arithmetic, categorical evidence-adjusted ratings with per-dimension explanations, matched SEC periods, forecast horizon guards, and saved browser snapshot review are implemented.

Validation: 21 regression tests pass; production build and type checks pass. Live NVDA, AMZN, GOOGL and MSFT reports exercised; CROX, DECK and IBM fail safely under current FMP subscription restrictions. See [live review](evals/LIVE_REVIEW_2026-09-25.md) for recorded results and limits.

## Remaining capabilities

- Independent intrinsic valuation and deeper primary-source qualitative analysis.
- Broader forecast coverage and deeper financial context for less-covered symbols.
- Account sign-in/cross-device recovery and scheduled historical-price evaluation.
- Analyst-level track records and supported options-chain analytics.
- Separate dependency maintenance for reported framework/test-tool advisories.

The portal is suitable for reviewing the research workflow and its disclosed sensitivity assumptions; it is not a trading system. No trades are executed.

NBIS follow-up: accept US-GAAP USD annual 20-F/40-F facts and amendments; show verified annual metrics when market quotes are unavailable. FMP errors preserve sanitized provider detail instead of treating every 402 as proof of endpoint exclusion. Quote/forecast entitlements still depend on the configured provider account.
