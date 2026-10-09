# Project 03: Enterprise Search

Ask questions across a synthetic company workspace (Confluence pages, Jira tickets, Slack threads, emails) and get an answer where **every claim cites a retrieved chunk**, or an explicit refusal when the documents don't support one. It is built the way an enterprise would build it, not as a generic RAG chatbot: configurable chunking, keyword/semantic/hybrid retrieval, reranking, permission filtering, citation enforcement, and a benchmark harness.

Runs locally with Python's standard library. No install and no API key needed.

## Run

```bash
cd projects/03-enterprise-search
python3 -m app.server          # http://127.0.0.1:8003
python3 -m evals.benchmark     # chunking x retrieval x rerank table
python3 -m unittest discover -s evals -t . -v
```

Try the example chips in the UI. Switch **Viewer** to `employee` and ask "What was Q3 ARR?" to see the board-update email stay invisible (the system refuses), then switch to `exec` to see it answered with a citation.

## What it teaches

- **Ingestion decisions:** three chunking strategies (`fixed` windows, `paragraph`, and `structure`-aware with per-source handling and title headers), content-hash dedupe so unchanged chunks are not re-embedded by paid embedders.
- **Retrieval:** BM25 keyword search, vector search, and hybrid fusion with reciprocal rank fusion (RRF), plus an optional reranking stage.
- **Enterprise concerns:** per-document access groups applied **before** ranking, so restricted text never reaches the model or the UI.
- **Reliable generation:** a JSON claim contract, citation validation, a deterministic support check, and refusal instead of guessing.
- **Evals:** context recall, context precision, MRR, p95 latency, citation validity, refusal correctness.

## Honest scope

- The corpus is **synthetic** (24 documents, 28 QA cases) shaped like Enterprise RAG Bench. It demonstrates the harness. It does not show real-world performance, and on a corpus this small, retrieval saturates (recall@3 is near 1.00 for most configurations), so differences between configs are small. Swap in a bigger corpus with `CORPUS_PATH` before drawing conclusions.
- The default **semantic** embedder is an offline hashing embedder with a small hand-written synonym lexicon. It is a stand-in for a trained embedding model. Set `EMBEDDINGS=openai` to use `text-embedding-3-small` instead (implemented and unit-tested against a stubbed HTTP call, not exercised against the live API in this repo).
- The **reranker** is a deterministic feature scorer (query coverage, phrase match, title match), standing in for a cross-encoder.
- The **Mock answerer** is extractive. It quotes sentences, so it answers about 70% of answerable benchmark questions with the right fact. It favors refusal over a wrong answer. OpenAI/Anthropic providers use the same citation-enforcement path but were not run against live APIs here.
- Latency numbers are single-process, in-memory, on tiny data. They show harness mechanics, not production latency.

## Use your own documents

```bash
CORPUS_PATH=~/notes python3 -m app.server   # folder of .md/.txt files
```

See `data/build_corpus.py` for the JSON schema (id, source, title, groups, text).

## Cost controls

Question length, request size, context characters (6,000), output tokens (700 default), and top-k (max 8) are capped server-side. Prompts place instructions and context before the question. OpenAI uses a stable `prompt_cache_key`; Anthropic uses automatic caching. Token and cache usage is returned and displayed. Deterministic work (retrieval, citation validation) never calls a model. See the [cost standard](../../docs/COST_OPTIMIZATION.md).

## More

- [Architecture](docs/ARCHITECTURE.md)
- [Decision log with benchmark results](docs/DECISIONS.md), the part to read before an interview
- [Example prompts](docs/EXAMPLE_PROMPTS.md)

## Next steps

Run the benchmark on real Enterprise RAG Bench data, swap in a real embedding model and cross-encoder reranker, add a vector index (pgvector), and deploy with latency tracking.
