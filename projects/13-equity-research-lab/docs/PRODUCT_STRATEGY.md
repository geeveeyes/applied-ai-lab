# Product strategy — personal tool first, generic later?

_Claude, 2026-09-30. A steering note, not a spec. Venkat's decisions override it._

## Two objectives

1. **Personal (priority now):** see my portfolio and decide hold / add / trim / sell for each position.
2. **Generic (future):** help anyone understand a stock, read a symbol and make a decision.

## Verdict

**Objective 1 is worth building and is now mostly served.** **Objective 2, as stated, is not a good bet**, for three reasons:
the market is crowded with free substitutes, personalized buy/sell output for other people raises regulatory issues, and
there is no evidence yet that the tool's signals are any good. A **narrower** generic version could work (see below), but only after the
personal version has earned a track record.

## Why "a generic tool to read any stock and decide" is weak

| Question | Honest answer |
|---|---|
| Is there a gap? | Mostly no. Morningstar (fair value + moat), Simply Wall St (DCF + portfolio "snowflake"), Seeking Alpha quant grades, Koyfin, and free research at Fidelity, Schwab and Robinhood already cover "read a symbol". General chatbots now do cited single-stock summaries for free. A new entrant's summary of a symbol is a commodity. |
| Is our analysis better? | Unproven. The DCF defaults (9% discount rate, consensus-growth fade, 15% margin of safety) are reasonable but **not backtested**. The six-factor weights are policy choices. `/performance` has almost no data. Being transparent is a real virtue; being accurate has not been shown. |
| Will beginners use it well? | Risky. Numbers like "Buy below $X" look precise and invite over-trust. Beginners need framing (position sizing, diversification, time horizon) more than another valuation. |
| Unit economics | A full report makes several paid calls (web-search brief plus a reasoning synthesis), on the order of dollars at list prices. FMP data has redistribution limits on most plans. Free quick checks help, but a public free tier would need licensed data and aggressive caching. |
| Regulation (not legal advice) | Telling a specific person to hold, add or trim **their** positions is personalized investment advice. In the US that generally requires registration as an investment adviser. The "publisher's exclusion" covers impersonal, general-audience content, not per-portfolio recommendations. The generic product would have to turn per-holding "decisions" into educational "considerations", or register. |

## Where a larger audience could really benefit (narrow, defensible)

**Concentrated-position holders, such as tech employees with RSU/ESPP stock**, often have 30–70% of their net worth in one employer stock (the AMZN case is the prototype).
Generic research sites don't handle their real question: how much to sell, when, and at what tax cost versus risk reduction. Human advisors charge ~1%/year for this.
The tool already has the pieces: concentration limits, staged-sale comparison, Monte Carlo in the Portfolio Lab, tax notes, and the position-decision rules.

If this goes generic, the positioning to test is **"an educational concentration-risk planner for employees paid in stock"**:

- It explains trade-offs and the user decides. No "Buy/Sell" verbs. Model portfolios and rules are shown as general education.
- Users supply their own data (CSV import from the broker). No brokerage connection at first.
- Quick checks and the math run locally and cheaply; full AI reports are an optional paid extra.

## What to do next (in order)

1. **Use it for 8–12 weeks personally.** Re-run full reports monthly on held names so `/performance` accumulates graded outcomes. Log any decision you actually acted on (a field to add).
2. **Validate before widening:** backtest the DCF zones on point-in-time data (the planned eval fixtures) and publish the hit rate, even if it's unflattering.
3. **Only then** prototype the concentration-planner framing with 3–5 RSU-holding friends. Watch whether they change a decision. That behavior change, not signups, is the success metric.
4. **Kill criteria:** if after ~3 months the zones don't beat a naive "hold the index fund" rule on your own names, or friends don't change a single decision, keep it personal.

## Implications for the codebase now

- Keep everything portfolio-first: holdings → decisions → watchlist → full reports (home page updated accordingly).
- Keep deterministic math in code and every rule visible. That transparency is the only defensible difference from incumbents.
- Keep the wording "research aid, not advice", and use "candidate / consider" rather than imperatives in anything that could be shared.
