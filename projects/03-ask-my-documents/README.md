# Project 03: Ask My Documents (POC)

Ask questions about a folder of local notes and get answers with chunk-level citations. Stdlib-only; no API key needed in mock mode.

> **Status: proof of concept.** Full plan and milestones: [docs/PLAN.md](docs/PLAN.md). Not yet signed off for full implementation.

## Run

```bash
cd projects/03-ask-my-documents
python3 -m app.cli "How much is the home office stipend?"
python3 -m app.cli "What is the stock vesting schedule?"   # refuses: not in the documents
python3 -m app.cli "When can I deploy code?" --docs /path/to/your/notes --json
```

## What the POC demonstrates

- Heading-aware, overlapping chunking with source + heading metadata.
- Hybrid retrieval: BM25 + hashed bag-of-words cosine, fused with reciprocal-rank fusion.
- Cited, extractive mock answers; citations are limited to retrieved chunks.
- Deterministic relevance gate that refuses out-of-scope questions.

## Evals

```bash
python3 -m unittest discover -s evals -v
```

Reports hit@4 and MRR on 6 answerable questions and checks refusal on 1 unanswerable one. The sample corpus is tiny (~8 chunks), so these numbers are a plumbing check, not a quality claim.

## Not yet built

PDF ingestion, web UI, real embeddings, LLM generation, larger eval set. See the plan.
