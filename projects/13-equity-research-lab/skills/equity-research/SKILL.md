# Equity Research Skill

Version: `equity-research-v0.1.0`

## Purpose
Analyze a public company without conflating business quality, valuation, market expectations and trade timing. Preserve every conclusion as a timestamped prediction so later retrospectives can improve the process.

## Mandatory principles
1. Prefer primary sources. SEC/company filings > market infrastructure > professional data > journalism > crowd sentiment.
2. Timestamp every factual claim and citation. Never use later information in a historical retrospective.
3. Separate **great company** from **good stock at this price**.
4. Focus on the **expectation gap**: what operating performance is already embedded in the price, and is reality likely to exceed it?
5. Present bull/base/bear cases and explicitly red-team the favored thesis.
6. A high score is not an instruction to trade. State assumptions, uncertainty, downside and thesis invalidation conditions.
7. Options are a separate decision layer. Compare shares, defined-risk option structures and no-trade; never infer “bullish stock = buy calls.”

## Scorecard (100 points)
- Business quality — 10
- Financial performance — 15
- Growth runway — 8
- Industry & moat — 10
- Leadership / talent / governance — 8
- Valuation — 15
- Analyst expectations — 8
- Sentiment / positioning — 7
- Technical / liquidity context — 4
- Catalysts — 5
- Risk / resilience — 5
- Portfolio fit — 5

Score each dimension from 0–100, multiply by its weight, and retain the component scores. Do not hide a weak valuation score inside a strong business score.

## Workflow
1. Resolve ticker, company, exchange and analysis timestamp.
2. Retrieve latest filings and 5–10 years of financial history where available.
3. Explain business model, revenue engines, unit economics and capital intensity.
4. Analyze revenue/EPS/FCF, margins, ROIC, dilution, leverage, cash conversion and earnings quality.
5. Map competitors, substitutes, suppliers/customers, market structure and moat durability.
6. Evaluate leadership: tenure, incentives, capital allocation, turnover, insider behavior and management promise-vs-delivery history.
7. Identify consensus expectations and estimate-revision direction.
8. Build valuation: relative multiples + scenario valuation + reverse DCF. State the growth/margin assumptions implied by the current price.
9. Rank analyst evidence by analyst/sector track record, sample size and recency; preserve source links.
10. Analyze professional, institutional, insider, short, options, news and retail sentiment separately.
11. Identify time-bounded catalysts.
12. Build bull/base/bear scenarios with probabilities and fair-value estimates.
13. Red-team: assume the investment loses 40%; identify the 3 most plausible causal paths and investigate them.
14. State thesis killers: measurable conditions that would change the verdict.
15. Evaluate portfolio fit separately from stock attractiveness.
16. Produce research verdict, confidence, fair-value range and 12-month return range.
17. Compare equity vs option structures only if live options data is available (IV, greeks, OI, volume, spread, DTE, earnings/event timing).
18. Save an immutable snapshot with skill version, model version, sources, assumptions, notes and benchmark.
19. At 30/90/180/365 days, evaluate actual and benchmark returns, range calibration, direction, excess return and which signals helped or hurt.

## Output contract
Return: ticker, company, analysis date, data freshness, verdict, confidence, total score, component scores, business thesis, expectation gap, valuation, analyst intelligence, sentiment, catalysts, risks, management credibility, scenarios, thesis killers, options decision frame, expected return range, benchmark, citations, and caveats.
