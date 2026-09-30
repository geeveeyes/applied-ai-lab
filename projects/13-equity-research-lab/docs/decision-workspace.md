# Decision workspace milestone

The home page follows three questions: research a company, compare AMZN diversification, and adjust an existing holding.

## Private holdings

`/holdings` accepts manual entry or a validated JSON snapshot. Data stays in this browser's local storage and is never sent to company research, public evidence caches, or the copied company summary. Browser profiles are the privacy boundary: another person using the same profile can read it. The user can export or clear it. Coverage, snapshot date, total scope and an explicit zero position are required to distinguish missing data from no ownership.

Add/trim arithmetic uses snapshot prices throughout. A cash-funded add leaves the denominator unchanged; new outside money increases it; a trim retains proceeds as cash. Oversells, cash shortfalls and inconsistent totals are rejected. Taxes and fees are excluded in this view. Fund overlap is disclosed without inventing look-through exposure.

## AMZN comparisons

`/amzn` compares keep, sell a chosen amount now, and sell equal portions of the initial shares at months 0, 3, 6 and 9. The same random market shocks drive all strategies. Sales pay an assumed tax on positive gains using proportional average basis. Later proceeds and taxes depend on the simulated AMZN price. There is no tax benefit for losses, final liquidation tax, future RSU vesting, cash flow, inflation or subsequent rebalancing. Non-AMZN investments and sale replacements share a blended proxy; users with materially different assets should use the multi-asset Portfolio Lab.

Defaults are illustrative. Tax rates are editable assumptions, not a tax calculation. Saved assumptions replay deterministically in the browser without a model call. The copied company summary never includes this comparison.

## Report costs

Responses usage is collected per generation, including completed responses that later fail parsing. Started requests with no response remain unknown. Cached input is a subset of input, reasoning is a subset of output, and no separate agent fee is added. Web search calls are separate from model tokens. Cached evidence retrieved from a prior generation incurs no new observed model call in that generation. Subscription costs and optional follow-up evidence are excluded.

Dollar estimates require `RESEARCH_PRICING_JSON`, keyed by the exact response model, with `asOf`, `inputPerMillion`, `cachedPerMillion`, `outputPerMillion`, and `searchPerCall`. Rates must be verified for the deployed provider and service tier. Missing rates or usage produce an unavailable total. Cache-write usage currently also withholds the estimate rather than applying an unsupported rate. Historical reports without a cost record remain unavailable.

Reference: https://developers.openai.com/api/docs/guides/prompt-caching

## Verification

Automated checks cover wealth conservation, taxed sales, identical-return assets, staged sales, oversells, unknown ownership, external funding denominators, invalid snapshots, and usage double counting. Real account examples are kept outside the repository.
