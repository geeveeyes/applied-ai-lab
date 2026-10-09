# Decision Log

Format: decision, evidence, trade-off. Numbers come from `python3 -m evals.benchmark` (24 documents, 28 QA cases, 25 answerable). Regenerate after any change.

```text
chunking   mode      rerank recall@3  prec@3    MRR  p95 ms
fixed      keyword   False      1.00    0.41   0.95    0.10
fixed      keyword   True       1.00    0.44   1.00    0.55
fixed      semantic  False      1.00    0.49   0.95    0.56
fixed      semantic  True       1.00    0.48   1.00    1.03
fixed      hybrid    False      1.00    0.45   0.94    0.45
fixed      hybrid    True       1.00    0.47   0.98    0.83
paragraph  keyword   False      0.96    0.37   0.98    0.10
paragraph  keyword   True       1.00    0.40   1.00    0.35
paragraph  semantic  False      1.00    0.40   0.96    0.26
paragraph  semantic  True       1.00    0.40   1.00    0.70
paragraph  hybrid    False      1.00    0.40   0.98    0.36
paragraph  hybrid    True       1.00    0.40   0.98    0.67
structure  keyword   False      1.00    0.48   0.96    0.09
structure  keyword   True       1.00    0.49   0.98    0.36
structure  semantic  False      1.00    0.47   0.96    0.29
structure  semantic  True       1.00    0.48   1.00    0.65
structure  hybrid    False      1.00    0.48   0.94    0.45
structure  hybrid    True       1.00    0.49   0.96    0.72

Answers (structure chunking, hybrid + rerank, mock answerer): {'answerable': 25, 'answer_has_fact': 17, 'refusal_expected': 3, 'refused_correctly': 3, 'claims': 29, 'valid_citations': 29}
```

## Caveat that shapes every decision below

The corpus is tiny, so recall@3 is close to 1.00 for almost every configuration. These numbers rank configurations only weakly. Treat each decision as a default to re-test on a larger corpus, not as a finding.

## 1. Chunking: `structure` as the default

- **Evidence:** `structure` (per-source handling, Slack grouped 3 messages with 1 overlap, title header prepended) has the best keyword and hybrid precision@3 (0.48 to 0.49) versus `paragraph` (0.37 to 0.40). `paragraph` is the only strategy that dropped below 1.00 recall (keyword, no rerank: 0.96).
- **Why:** Slack lines are meaningless without neighbors, and a title header gives short chunks context.
- **Trade-off:** more chunks (38 vs 32) and a source-specific code path.

## 2. Retrieval mode: hybrid by default, but not proven better here

- **Evidence:** keyword, semantic, and hybrid are within a few points of each other. Keyword is fastest (p95 about 0.1 ms vs about 0.4 ms for hybrid).
- **Why hybrid anyway:** exact identifiers (ticket ids, product names) favor keyword, while paraphrases favor semantic. The QA set contains both kinds, and hybrid avoids committing to one failure mode.
- **Trade-off:** two indexes to maintain and a fusion step. Revisit with a larger corpus.

## 3. Reranking: on

- **Evidence:** MRR rises in most rows (for example structure+keyword 0.96 to 0.98, structure+semantic 0.96 to 1.00, paragraph+keyword 0.98 to 1.00). Latency grows by a fraction of a millisecond here.
- **Caveat:** the reranker is a deterministic feature scorer, and a real cross-encoder will cost tens to hundreds of ms. Measure it before enabling by default in production.

## 4. Access control: filter before ranking

- Verified by `test_acl_filters_before_ranking` across all three modes. An `employee` asking about Q3 ARR is refused, and `exec` gets a cited answer.

## 5. Citation enforcement and refusal

- **Evidence:** with the mock answerer, 100% of emitted claims cite a retrieved chunk, and 3 of 3 refusal cases (2 unanswerable, 1 restricted) refuse.
- **Cost of the choice:** only about 17 of 25 answerable questions get the exact expected fact from the extractive mock. Tightening thresholds fixed a leak (the restricted-ARR case initially returned an unrelated sentence) at the price of coverage. The same thresholds apply to model output.
- **Failure the support check can't catch:** a claim made of words that all appear in the chunk but arranged to assert something false. An LLM judge or entailment model would be the next step.

## 6. Embedder: offline hashing with a synonym lexicon

- Chosen so the project runs and evals with no keys. The lexicon was written while looking at the QA set, so semantic results are optimistic. Do not quote them as evidence that semantic search works. `EMBEDDINGS=openai` is the real comparison to run next.

## Interview prompts this project prepares for

- Why filter by permission before ranking?
- When did hybrid beat keyword, and how would you know with more data?
- What did you lose by enforcing citations, and how would you measure that?
- What does your p95 look like, and what would change it at 5M chunks?
