# Equity Research Skill

Version: `equity-research-v0.4.0`

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
8. **Evidence gates scores.** Do not use model prior knowledge to award high moat, leadership, catalyst, governance, risk or other qualitative scores when the evidence packet does not support them.
9. Track **evidence coverage per score dimension**. Low-coverage dimensions must be visibly capped or discounted rather than contributing with false precision.
10. **Match valuation to horizon.** A 12-month fair value must use earnings/cash-flow evidence appropriate to the 12-month target date, not simply the nearest fiscal-year estimate.
11. Reverse DCF is an **expectations test**, not an intrinsic-value oracle. Expose discount rate, terminal growth, cash-flow base, horizon and important omitted items.

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

Score each dimension from 0–100, multiply by its weight, and retain the component scores **and evidence coverage**. Do not hide a weak valuation score inside a strong business score. When evidence coverage is weak, cap the score rather than allowing the model to fill gaps from general knowledge.

## Workflow
1. Resolve ticker, company, exchange, market timestamp and analysis timestamp.
2. Retrieve the latest annual filing and latest interim filing. Preserve fiscal period end and filing date separately.
3. Extract recent annual and quarterly revenue, earnings, cash flow, capex/FCF, margins where available, and identify freshness gaps.
4. Retrieve forward estimates and treat estimate dates as **fiscal period-end dates**, not publication timestamps.
5. Explain business model, revenue engines, unit economics and capital intensity only to the extent supported by evidence.
6. Analyze revenue/EPS/FCF, margins, ROIC, dilution, leverage, cash conversion and earnings quality.
7. Map competitors, substitutes, suppliers/customers, market structure and moat durability only when source-backed evidence exists.
8. Evaluate leadership only when the packet contains evidence for tenure, incentives, capital allocation, turnover, insider behavior or promise-vs-delivery history.
9. Identify consensus expectations and estimate-revision direction.
10. Build valuation with explicit horizon alignment:
   - choose the fiscal estimate relevant to the 12-month target date;
   - make bull/base/bear P/E or other multiple assumptions explicit;
   - never use analyst price targets as intrinsic value.
11. Run reverse DCF / expectations analysis. State what FCF growth/margins are required for today's market value to make sense, with assumptions and caveats.
12. Rank analyst evidence by track record when analyst-level data is available; otherwise clearly label consensus-only evidence.
13. Analyze professional, institutional, insider, short, options, news and retail sentiment separately when data exists.
14. Identify time-bounded catalysts with evidence; otherwise keep catalyst coverage low.
15. Build bull/base/bear scenarios with probabilities and horizon-correct fair-value estimates.
16. Red-team: assume the investment loses 40%; identify the 3 most plausible causal paths and investigate them.
17. State thesis killers: measurable conditions that would change the verdict.
18. Evaluate portfolio fit separately from stock attractiveness. Without portfolio data, coverage must remain low.
19. Produce research verdict, confidence, fair-value range and deterministic 12-month return range.
20. Compare equity vs option structures only if live options data is available (IV, greeks, OI, volume, spread, DTE, earnings/event timing).
21. Save an immutable snapshot with skill version, model version, sources, assumptions, evidence coverage, notes and benchmark.
22. At 30/90/180/365 days, evaluate actual and benchmark returns, range calibration, direction, excess return and which signals helped or hurt.

## Output contract
Return: ticker, company, analysis date, market-data timestamp, data freshness, verdict, confidence, total score, component scores, component evidence coverage, business thesis, latest-quarter evidence, expectation gap, horizon-correct valuation, reverse-DCF expectations test, analyst intelligence, sentiment, catalysts, risks, management credibility, scenarios, thesis killers, options decision frame, deterministic expected-return range, benchmark, citations and caveats.
