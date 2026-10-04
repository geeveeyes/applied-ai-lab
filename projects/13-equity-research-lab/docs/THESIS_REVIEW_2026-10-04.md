# Dated investment-case reviews — October 4, 2026

## Owner outcome

A new full company report can show up to three checks answering: what evidence supports the case, what would change the view, and when to revisit it. My holdings shows reviews due, missing evidence, unresolved questions and report age, with a link to the saved report. Opening that link uses in-app navigation and preserves the connected snapshot in the tab.

## Adaptation of the supplied skill

The supplied gated analysis package had useful falsifiable thesis conditions, company-specific questions, and a separation between business quality and price. Its retrospectively fitted case studies did not validate prediction. Rigid sector gates could recreate blanket wait verdicts. Cash-flow, dilution and scenario probability conventions needed correction, and personal concentration, taxes and fund overlap were incomplete.

This delivery adapts the useful research discipline into the existing provider-neutral equity research skill. It does not install the friend's package or apply its numerical gates. The independently authored reference explains cash-flow consistency, source discipline, retrospective limitations and portfolio context. Company prompts cover Amazon segments, semiconductor customers/cycles, lenders and defense, with general questions for other companies. These are prompts, not validated sector models.

## Implementation and limits

- Optional `thesisReview` on saved reports; fresh provider requests require it. Existing reports and legacy adapter responses remain readable and immutable.
- Deterministic validation checks real calendar dates, excludes future evidence, removes unsafe/out-of-catalog URLs, and withholds observations without dated linked evidence.
- Review dates distinguish reported events from suggested planning dates. A due date never establishes that a failure condition happened. Conditions are research judgments and are not automatically evaluated.
- Source membership establishes provenance, not semantic truth. Neither the validator nor this milestone proves a citation supports a claim. Fresh live output still needs evaluation.
- Existing valuation, scores, buy/hold/trim policy and scenario math remain unchanged. No additional model calls, account refreshes or trades. The bounded review fields modestly increase the existing full-report response size.
- Fixed a misleading 20% default limit label; the implemented default is 10%.
- No database migration. JSON report storage accommodates the optional field.

## Validation

180 tests pass, including invalid/future dates, unsafe/unrecognized URLs, missing evidence, UTC review deadlines, legacy reports, provider output bounds and component rendering. TypeScript and production build pass. Local Chrome verification: home loads, a synthetic saved report shows missing evidence and suggested date clearly, and the holdings table shows the review column for an illustrative position. No console errors captured. Test report was removed; illustrative holdings were not saved. The preferred agent-browser CLI was unavailable, so the connected Chrome tool was used.

The skill validator script could not run because PyYAML was absent in both Python runtimes; frontmatter and reference paths were inspected directly. No package installation or runtime dependency change was needed.

## Next priorities

1. Evaluate one fresh live report against its cited evidence, especially reported event dates and proposed thresholds. Preserve it as a dated evaluation case; do not declare predictive accuracy.
2. Improve sector-specific valuation, cash-flow forecasts and dilution sensitivity using primary sources and deterministic calculations.
3. Complete fund look-through, employer/RSU exposure and tax-lot-aware allocation comparisons.
4. Maintain prospective benchmarked outcomes across all recommendations, including failures and unrated cases.

The owner's first live brokerage refresh and coverage reconciliation remain pending in the existing Notion action item.
