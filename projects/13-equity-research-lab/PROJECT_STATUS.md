# Project Status

## v0.5.1 — review release

Deterministic evidence confidence and scenario arithmetic, categorical evidence-adjusted ratings with per-dimension explanations, matched SEC periods, forecast horizon guards, and saved browser snapshot review are implemented.

Validation: 17 regression tests pass; production build and type checks pass. Live NVDA, AMZN, GOOGL and MSFT reports exercised; CROX, DECK and IBM fail safely under current FMP subscription restrictions. See [live review](evals/LIVE_REVIEW_2026-09-25.md) for recorded results and limits.

## Remaining capabilities

- Independent intrinsic valuation and deeper primary-source qualitative analysis.
- Broader market-data entitlement for additional symbols.
- Durable server-side snapshots and scheduled historical-price evaluation.
- Analyst-level track records and supported options-chain analytics.
- Separate dependency maintenance for reported framework/test-tool advisories.

The portal is suitable for reviewing the research workflow and its disclosed sensitivity assumptions; it is not a trading system. No trades are executed.
