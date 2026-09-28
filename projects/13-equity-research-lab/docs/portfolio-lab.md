# Portfolio Lab Phase 1

## Architecture review and implementation

Existing company research uses Next.js server routes, FMP quote/estimate adapters, Alpha Vantage end-of-day fallback, SEC filings, and owner-scoped Supabase snapshots. None of those quote or analyst fields is sufficient for estimating historical covariance. The portfolio feature reuses the server-only database client, workspace-cookie ownership and atomic Alpha Vantage allowance, while keeping its model and archive separate from company reports.

- `lib/portfolio/engine.ts`: pure correlated Market Monte Carlo; callable outside the UI. Fixed seed and common random shocks across strategies.
- `lib/portfolio/history.ts`: adjusted monthly data validation, aligned-window returns, volatility and correlation estimation.
- `lib/server/portfolio-history.ts`: Alpha Vantage monthly adjusted history; cached for 24 hours with namespaced keys in the existing provider cache. Shares the atomic 24-call/day Alpha allowance with quotes. No credentials sent to the browser.
- `lib/portfolio/model.ts`: bounded API request contract and compact result summaries.
- `app/api/portfolio`: simulations and private snapshot listing; `[id]` reads an owner-scoped immutable result; `history` estimates risk from historical data.
- `components/PortfolioLab.tsx`, `PortfolioCharts.tsx`: two allocations, editable assumptions, fan charts on a shared vertical scale, histograms, progressive disclosure, export and reopen.
- Migration004 adds a separate RLS-protected table. Service role can select/insert only. Browser copies are a disclosed fallback, not a claim that cloud persistence succeeded.

## Historical data

Official endpoint documentation: https://www.alphavantage.co/documentation/#monthlyadj

Monthly **adjusted** closes avoid treating raw split price changes as returns. Current incomplete month is excluded. All noncash assets must have consecutive common months for the full selected 1/3/5/10-year window; no silent pairwise sampling, forward-fill, shortened window, or fabricated history. Missing/unsupported data returns an explicit error. Manual assumptions remain usable. Historical estimates and their retrieval dates are frozen with the run.

Historical CAGR and arithmetic monthly mean ×12 are descriptive. Neither automatically sets forward expected return. Risk estimation uses sample log-return covariance, annual volatility sqrt(12 × sample variance), and the common-window correlation matrix. One-year correlation estimates are especially noisy. Cash is deterministic with a user-specified return, not inferred from stock history.

## Model contract

10,000 paths, two strategies, up to eight unique long-only USD assets, and 5/10/20-year horizons in the public API. The pure engine supports larger bounded jobs for future callers, but Phase1 UI/API deliberately limits workload. Defaults are explicitly illustrative and require acknowledgment. No broker accounts are imported.

For asset i over one month:

`growth = exp((log(1 + expectedAnnualReturn) - volatility² / 2) / 12 + volatility / sqrt(12) × correlatedNormal)`

The entered annual return is expected one-year simple growth, so expected one-year value is initial ×(1+r), rather than exp(r). It is not geometric median growth. Correlations apply to Gaussian log-return shocks. Singular positive-semidefinite matrices (including perfect correlation) are supported; inconsistent matrices are rejected. PRNG state wraps to unsigned32 bits on every step so long streams do not exceed JavaScript integer precision.

Monthly/annual/no rebalancing is explicit. Flows happen after returns each month; contributions buy at target weights, withdrawals sell proportionately and cannot exceed remaining wealth. Failed withdrawals are counted. Rebalancing restores target weights after flows and incurs no tax or trading cost in this MVP.

Drawdown uses unitized returns excluding external cash flows, sampled monthly; intramonth drawdowns are omitted. Loss probability compares terminal wealth with starting value plus actual net contributions/withdrawals. Goal probability is terminal attainment, not first passage. Worst5% output is mean terminal **wealth**, not a loss amount. Starting allocation volatility is w'Σw; it is not realized future volatility after weights drift. HHI is holding-level and includes funds/cash, not sector or fund look-through concentration. Percentile bands are pointwise, not joint path envelopes. No strategy is declared the winner.

Outputs are nominal, pre-tax and gross of fees. No fat tails, market jumps, crisis correlations, time-varying expected returns, fund look-through, tax-lot accounting, RSU vesting, leverage, options, or account restrictions. This is not a historical strategy backtest, a probability of permanent loss, or Fundamental Monte Carlo. Research scores never become return forecasts.

## Validation and remaining phases

Tests cover deterministic growth, perfect/zero correlation, positive-semidefinite rejection, reproducible seeds, rebalancing, contributions, withdrawals/depletion, nonnegative outcomes, analytic distribution checks, sample-size convergence, historical alignment/staleness, and input bounds. The four requested sample portfolios are compared under common illustrative assumptions; this is model validation, not an investment recommendation.

Phase2: richer goals/stress regimes/strategies. Phase3: explicit transaction/tax/account/RSU modeling and broker or lot imports with user-selected scope. Phase4: a separate fundamental valuation distribution engine, subsequently linked into portfolio scenarios. Cost/score-reference/holdings feedback from the prior feedback batch remains queued.
