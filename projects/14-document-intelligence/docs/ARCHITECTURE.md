# Architecture

| File | Responsibility |
|---|---|
| `data/generate.py` | seeded generator for contracts, decoys, phrasing variants, and gold labels |
| `app/schema.py` | field specs, text normalization, validation with evidence grounding |
| `app/rules.py` | `extract_v1` (naive) and `extract_v2` (normalizing, sentence-anchored) |
| `app/llm.py` | glossary prompt, OpenAI/Anthropic calls, strict JSON schema |
| `app/pipeline.py` | extractor registry, `process()`, cost estimate |
| `app/server.py` | `/api/config`, `/api/sample`, `/api/extract`, static UI |
| `evals/benchmark.py` | per-field P/R/F1, per-phrasing accuracy, decoy vs clean, cost per 1,000 docs |

## Why evidence quotes

An extractor that returns only values can't be audited. Requiring a verbatim quote lets deterministic code remove values the document doesn't support, and lets a reviewer see why a value was chosen. The failure it cannot catch is a real quote misread.

## Scoring rules

For each field: gold and prediction both null counts for nothing; predicted but wrong counts as one false positive and one false negative; predicted when gold is null is a false positive; missing when gold exists is a false negative. This makes precision penalize hallucinated values and recall penalize silence, which is the trade-off to discuss.
