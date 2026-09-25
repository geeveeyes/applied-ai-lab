# Backend live review — 2026-09-25

Version: equity-research-v0.6.0. Initial implementation commit: 02ac41c.
Migration 002 applied to the linked Equity Research Lab Supabase project.

| Symbol | Quote source | Score | Confidence | Verdict | Persistence |
|---|---|---:|---:|---|---|
| NVDA | FMP | 61 | 57% | Watch | Cloud |
| AMZN | FMP | 54 | 57% | Avoid for now | Cloud |
| GOOGL | FMP | 57 | 58% | Watch | Cloud |
| MSFT | FMP | 58 | 58% | Watch | Cloud |
| NBIS | Alpha Vantage EOD | 47 | 26% | Insufficient data | Cloud |

These are recorded test outputs, not recommendations. Prices and ratings are snapshots.
NBIS quote: $243.48, trading date 2026-09-24. No EPS estimates or scenarios fabricated.
FMP samples have a negative bear return, neutral base, and positive bull return.
NBIS annual 20-F financials remain visible with missing-quarter and cash-burn caveats.

Validation:
- 30 automated tests pass, including malformed quotes, fallback order, request-budget
  failure, cached quote reuse, owner-scoped reads, and immutable-insert failure handling.
- Production build and type checks pass.
- Live archive API returned identical frozen reports when reopened for each FMP sample.
- Each report returned HTTP 404 from a separate cookie-free workspace.
- NBIS opened through the live portal, saved in the cloud archive, and reopened with
  the identical original analysis timestamp and end-of-day quote.
- Supabase confirms all three new tables have RLS enabled and no SELECT privilege
  for anonymous or authenticated browser roles. Only server credentials access them.
- Alpha Vantage request accounting and persistent quote cache created successfully.

Limits: no cross-device account access or cookie-loss recovery yet. Missing analyst
forecasts remain missing. EOD prices are not real-time. No scheduled performance
measurements, independent intrinsic valuation, or trade execution was added.
