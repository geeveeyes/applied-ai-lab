# Architecture

```
DOCS_DIR (.md/.txt/.pdf)
  -> loader.py   per-file sha256, per-file errors, size caps, PDF text per page
  -> rag.py      chunk_doc (heading-aware, 700 chars, 100 overlap, page kept)
  -> embedders   HashEmbedder (offline) | OpenAIEmbedder (text-embedding-3-small, batched)
  -> Index.build embeds only files whose hash changed; cache in .index/<provider>.json
question
  -> Index.search  BM25 + cosine, fused with reciprocal-rank fusion (modes: lexical|dense|hybrid)
  -> providers.generate  mock (extractive + IDF coverage gate) | OpenAI Responses API (strict JSON schema)
  -> rag.validate  drop citations not in the retrieved set; uncited answer => refusal
  -> server.py / cli.py / static UI
```

## Decisions

- **Flat JSON vectors + brute-force cosine.** At the 2,000-chunk cap that is ~2k dot products per query: milliseconds, zero infrastructure, no cost. A vector DB adds a service and no benefit at this size. Swap in one if the corpus passes ~50k chunks.
- **Hybrid retrieval.** Keyword wins on exact facts ("$500"); embeddings win on paraphrase. Both are measured in `python3 -m evals.report`.
- **Refusal in two places.** Mock gates on IDF-weighted term coverage. With OpenAI, the model must set `answerable`, and an answer with no valid citation is converted to a refusal anyway.
- **Cost controls (see lab standard).** Stable instructions and schema first, chunks next, question last; `prompt_cache_key`; usage telemetry shown in the UI; 500-char questions, 4 chunks, 6,000-char context, 600 output tokens; indexing OpenAI is an explicit button, never implicit; re-index skips unchanged files.
- **Security.** The folder is chosen server-side only; the UI renders document text with `textContent`; chunk text is labelled as data in the prompt; the server binds to 127.0.0.1.

## Known limits

Scanned PDFs, tables, and images are not read. Chunks are not reranked. No conversation memory. Prompt-injection text inside a document can still influence the model; the instruction and citation validation reduce, not remove, that risk. The mock answerer is extractive and misses paraphrases that need synonyms.
