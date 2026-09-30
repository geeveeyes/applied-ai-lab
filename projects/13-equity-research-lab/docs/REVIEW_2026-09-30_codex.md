# Combined-tool review — September 30, 2026 (Codex)

Reviewed GitHub main `50439a1`, Claude's missing four-commit patch, and the Notion project/handoff pages. Baseline: 123 tests on main; 134 after recovering the patch.

## Assessment

The combined product has a useful personal-investing workflow: holdings → concentration and position review → inexpensive screening → full research for finalists → decision journal. Codex contributed dated evidence, peer comparisons, portfolio scenarios and readable decisions. Claude materially improved cost control, portfolio-first navigation, deterministic valuation, quick checks and outcome tracking. Neither platform has demonstrated predictive investment performance yet.

The next milestone should be trustworthy decisions on the owner's real holdings, including explicit reasons to wait. More Buy labels alone would not meet the mission.

## Delivered in this review branch

1. **Recovered unfinished integration.** PR #3's title described broker import, one scoring model and backtest, but its merged tree contained only the first eight commits. Applied `equity-part2-import-scoring-backtest.mbox` with Claude's authorship preserved. No reimplementation of that work.
2. **Corrected margin of safety.** A value of $100 with a 15% discount requires a price of $85 or lower. The previous division by 1.15 allowed $86.96. All displayed buy-below calculations now use 0.85 × value.
3. **Blocked unsupported automatic signals.** Missing/stale/future quotes cannot get a valuation zone. Missing forecasts, incomplete balance sheets, commodity cyclicals without normalization and net-income proxies remain illustrative and cannot set the valuation factor. Old cached checks are invalidated by model version.
4. **Made the cash-flow convention coherent.** CFO less capex is after interest. The new version uses an equity cash-flow approximation with zero net borrowing and equity discount rates. It no longer discounts an after-interest stream and then subtracts debt again. Cash/debt remain visible context. Net income alone does not establish distributable cash. Frozen reports remain unchanged; model versions distinguish old and new results.
5. **Restored decision priority.** A full hold/wait report is not overridden by a quick-check Buy zone. Expired quick checks cannot drive adds; old buy reports need refreshed price/valuation. Importing a CSV with skipped securities marks coverage partial.
6. **Made spending reservations atomic.** Full-report and quick-check calls reserve usage before work. Conditional updates prevent two workers claiming the same remaining slot; failed attempts retain reservations. Uses the existing private usage table, without a new database migration. Fails closed when the ledger cannot be read/written.

Six decision-regression tests failed before their fixes; a seventh verifies the cash-flow convention. Concurrent-reservation tests verify that 20 requests can claim only five slots at a cap of five. Final suite: 144 tests.

## Important remaining work, in order

- **Source/date fidelity and model evaluations.** Link claimed evidence dates to publication/filing metadata. Build a fixed, reviewable set of full-report examples, including adverse and incomplete cases. Coverage is not factual certainty.
- **Valuation quality.** Revenue CAGR is still a proxy for cash-flow growth; discount rates are policy defaults. Add normalized reinvestment, dilution/SBC, borrowing and sector-specific assumptions. Bank book multiples are not tangible-common-book valuations. Compare results with independently constructed valuations before trusting price thresholds.
- **Portfolio completeness.** Fund look-through, overlap with AMZN and sector ETFs, tax lots and outside-account coverage remain incomplete. A fund is not automatically diversified. Current concentration outputs should be read with those limits.
- **Outcome validation.** The recovered backtest uses historical trailing growth rather than point-in-time consensus. Selected surviving tickers, filing/share-count timing around splits, and policy differences limit it. Snapshot/journal returns do not yet provide a total-return, risk-adjusted benchmark track record. Do not publish an accuracy claim from a handful of results.
- **Durability and maintenance.** Holdings/watchlists/journal remain browser-local. Add user-controlled export/recovery before cross-device reliance. Handle the existing Next/postcss advisory separately with a deliberate dependency upgrade.

## Shared working agreement

GitHub is the source of truth for code and tests; Notion records user decisions, status and handoff. Start from current main, claim a branch, identify the intended change and touched files, and link the PR in both places. Check the actual merged tree and CI, not a PR title or a stale handoff. Preserve the other agent's work and authorship. Release the baton with exact remaining work; no secrets or raw brokerage statements in either handoff.

## References

- [Notion project](https://app.notion.com/p/3ebdf6e02bd7810993bdfeb528c0a5b9)
- [Merged PR #3](https://github.com/geeveeyes/applied-ai-lab/pull/3)
- [CFA Institute: free cash flow valuation](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/free-cash-flow-valuation)
- [Damodaran: cash flows and reinvestment](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/littlebook/cashflows.htm)
