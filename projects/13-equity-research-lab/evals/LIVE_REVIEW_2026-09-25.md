# Equity Research Lab review notes — September 25, 2026

Version: equity-research-v0.5.1. Portal: https://13-equity-research-lab.vercel.app/

## Changes

- Deterministic, price-anchored bull/base/bear sensitivity. The base is neutral by construction; bear includes earnings downside and multiple compression. Scenario weights and shocks are explicitly policy assumptions, not empirically calibrated probabilities or independent fair values.
- Confidence is entirely deterministic from evidence coverage, freshness, primary-source ratio, EPS estimate breadth and dispersion. It is not a probability of investment success.
- Removed ambiguous model-generated numeric scores. Named ratings map to a fixed numeric scale and require explanations for every dimension. Weak evidence shrinks ratings toward neutral rather than producing false negative business judgments.
- SEC cash flow/capex and revenue/gross-profit calculations require matching reporting periods.
- No expired or distant EPS substitution; loss-making horizon periods cannot be skipped for a later profitable year.
- Reverse DCF reports out-of-range solutions as unavailable and discloses the limitations of annual CFO minus cash capex, investment intensity, financing, net debt and dilution.
- Archive links open saved reports without new analysis. Reports remain browser-local, not durable server-side records.
- Added loading and invalid-ticker states. Suppressed unsupported options strategy recommendations and withheld Buy candidate until independent valuation evidence exists.

## Live API results

These are recorded test outputs, not investment recommendations. Qualitative ratings and prose can vary between runs; confidence and scenario math are reproducible for identical input evidence.

| Ticker | Score | Evidence confidence | Recorded verdict | Bear return % | Bull return % |
|---|---:|---:|---|---:|---:|
| NVDA | 62 | 57% | Watch | -35.9 | 33.4 |
| AMZN | 51 | 57% | Avoid for now | -33.6 | 34.6 |
| GOOGL | 55 | 58% | Watch | -28 | 32 |
| MSFT | 58 | 58% | Watch | -28 | 32 |
| CROX | Withheld | Withheld | Insufficient data | — | — |

All four supported reports passed scenario ordering, downside/upside, neutral base, 100% weight sum, score bounds, twelve score explanations, and absence of options recommendations. Each uses the intended target fiscal period: NVDA January 2028; AMZN and GOOGL December 2027; MSFT June 2028. These fiscal estimates are not trailing EPS or a precise interpolated next-twelve-month estimate.

CROX, DECK and IBM returned FMP plan restrictions for quote, estimates and consensus. They correctly withheld price, score and scenarios. A full less-obvious-company research validation remains limited by the data subscription; no replacement data or demo values were inserted.

## Validation

- 17 regression tests passed; production build and TypeScript checks passed.
- Vercel production deployments checked after publishing.
- Browser: search submission, report rendering, loading state, provider-restricted report, archive list and reopening an original saved timestamp checked.
- Initial live testing exposed numeric-score scale drift (0–10 output displayed as 0–100), which was fixed with the categorical schema and regression coverage.
- Initial testing exposed archive links generating new reports, fixed with a snapshot detail route.

## Limits for review

Independent intrinsic valuation, richer qualitative research, persistent server-side history, analyst track records and retrospective performance evaluation remain unfinished product capabilities. The performance and analyst pages are placeholders. Current scores are research triage; the price scenarios are stress tests. Missing estimate publication dates prevent confirming actual estimate freshness. SEC filing links include metadata and numeric facts; full filing narrative is not yet analyzed.

Dependency audit also reports existing Next/PostCSS and Vitest advisories; available recommended fixes include major framework/test-runner upgrades. Those were not forced as part of research calibration. This review release is not a claim of production security certification.
