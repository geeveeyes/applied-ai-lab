# Decision Log

Numbers are from `python3 -m evals.benchmark` (40 synthetic contracts).

## 1. Extractor choice: rules_v2 first, models for the long tail

- **Evidence:** rules_v1 micro F1 0.45, rules_v2 0.95. All of rules_v2's misses are `unseen` phrasings (0% on those four categories).
- **Decision:** use cheap deterministic rules for known phrasings and route documents with missing fields to a model. Cost on this data is $0 for rules vs an estimated model cost per 1,000 documents shown by the benchmark (illustrative prices).
- **Open question to answer with a key:** how much of the unseen 10% a small model recovers, at what cost per recovered field. This repo does not yet contain that measurement.

## 2. Grounded evidence over bare values

- Every field needs a quote present in the normalized document. Values failing that check are dropped as `ungrounded` and counted as validation issues.
- **Cost:** a correct value with a sloppy quote is dropped too, which lowers recall. rules_v1's default `auto_renewal: false` (no evidence) is dropped for this reason.

## 3. Nulls are valid answers

- `liability_cap_usd` is null when the cap is relative ("fees paid in the preceding 12 months") or absent. The glossary says so explicitly, because a model otherwise tends to read "twelve (12)" as a dollar cap.

## 4. Decoys in the benchmark

- 40% of contracts include a superseded-order-form date, a late-fee grace period, a billing-notice period, and a support-credit cap. rules_v2 is anchored by sentence context (it ignores sentences without the right keywords), and accuracy on decoy contracts matches clean contracts (0.90 vs 0.91).

## Interview prompts

- Why precision and recall per field instead of one accuracy number?
- What would you do about the 10% your rules can't read?
- Why make the model quote its evidence, and what does the check miss?
- What is the break-even document volume between rules plus model fallback and model-only?
