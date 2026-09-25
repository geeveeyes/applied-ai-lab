# Project Status

## v0.5.2 — foreign-filer and partial-evidence support

Deterministic evidence confidence and scenario arithmetic, categorical evidence-adjusted ratings with per-dimension explanations, matched SEC periods, forecast horizon guards, and saved browser snapshot review are implemented.

Validation: 21 regression tests pass; production build and type checks pass. Live NVDA, AMZN, GOOGL and MSFT reports exercised; CROX, DECK and IBM fail safely under current FMP subscription restrictions. See [live review](evals/LIVE_REVIEW_2026-09-25.md) for recorded results and limits.

## Remaining capabilities

- Independent intrinsic valuation and deeper primary-source qualitative analysis.
- Broader market-data entitlement for additional symbols.
- Durable server-side snapshots and scheduled historical-price evaluation.
- Analyst-level track records and supported options-chain analytics.
- Separate dependency maintenance for reported framework/test-tool advisories.

The portal is suitable for reviewing the research workflow and its disclosed sensitivity assumptions; it is not a trading system. No trades are executed.

NBIS follow-up: accept US-GAAP USD annual 20-F/40-F facts and amendments; show verified annual metrics when market quotes are unavailable. FMP errors preserve sanitized provider detail instead of treating every 402 as proof of endpoint exclusion. Quote/forecast entitlements still depend on the configured provider account.
