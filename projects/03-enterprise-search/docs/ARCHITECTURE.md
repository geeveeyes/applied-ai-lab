# Architecture

```text
corpus.json / folder
      |
  chunking.py ---- fixed | paragraph | structure
      |
  index.py (ingest) -- content hash, embed, BM25 stats
      |
 query --> ACL filter (viewer groups) --> keyword | semantic | hybrid(RRF) --> rerank --> top-k
      |
  answer.py -- prompt (instructions, chunks, question last) --> provider (mock | openai | anthropic)
      |
  enforce_citations -- valid ids, support check, refusal
      |
  server.py JSON API --> static UI
```

## Modules

| File | Responsibility |
|---|---|
| `app/text.py` | tokenizer, stemmer, stopwords, offline concept lexicon |
| `app/chunking.py` | three chunkers returning chunks with stable ids and content hashes |
| `app/embeddings.py` | `HashingEmbedder` (offline) and `OpenAIEmbedder`; sparse vectors |
| `app/index.py` | ingest, BM25, vector search, RRF fusion, rerank, access filtering |
| `app/answer.py` | prompt builder, mock answerer, provider calls, citation enforcement |
| `app/server.py` | stdlib HTTP server: `/api/config`, `/api/ask`, `/health` |
| `evals/` | QA set, benchmark, unit tests |

## Key design points

- **Access control before ranking.** `Index.visible(viewer)` restricts the candidate set for every retrieval mode. Filtering after ranking would leak through scores and waste top-k slots.
- **Hybrid fusion uses ranks, not scores.** BM25 and cosine scores have different scales, so RRF (`1/(60+rank)`) combines them without normalization.
- **Citation contract.** A claim survives only if it cites a retrieved chunk id and at least 60% of its content words appear in that chunk. This is a deterministic faithfulness proxy, cheaper than an LLM judge, though weaker.
- **Refusal is a first-class result.** `refused: true` carries the reason claims were dropped.
