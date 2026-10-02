# Project 03 — Ask My Documents: Plan

Status: **Signed off (OpenAI, JSON vector store, optional pypdf). Milestones 1–6 implemented; OpenAI live eval and eval on real notes pending.**

## Objective

Point the app at a folder of local notes/PDFs, ask questions, and get answers that are **grounded and cited to specific chunks**, with a measured retrieval quality and an explicit "not in your documents" refusal. Demoable in under 2 minutes.

Success criteria (the bar for "complete"):
1. Ingest a folder of `.md`, `.txt`, `.pdf`; re-ingest skips unchanged files (content hash).
2. Every answer sentence carries a citation to a retrieved chunk; invalid citations are dropped (same contract as Project 02).
3. Unanswerable questions are refused, not hallucinated.
4. Retrieval eval reports hit@k and MRR on a ≥25-question set, comparing lexical vs. dense vs. hybrid, so the choice of retriever is evidence-based.
5. Mock mode (no keys) works end to end; real providers follow the lab's [cost standard](../../../docs/COST_OPTIMIZATION.md) (stable prefix, usage telemetry, caps).

## Architecture

```
folder -> loader -> chunker (heading-aware, overlap) -> index (BM25 + vectors, cached by hash)
question -> retrieve top-k (hybrid, RRF) -> [optional rerank] -> context budget
        -> provider (mock | OpenAI | Anthropic) -> JSON {answer, citations}
        -> validate citations against retrieved chunk IDs -> UI / CLI
```

Design choices
- **Python stdlib server + vanilla UI**, matching Projects 01/02 (run with `python3 -m app.server`).
- **Retriever is pluggable**; embeddings via one `embed()` function. Mock = hashed bag-of-words; real = OpenAI/Voyage-style embeddings API. Vectors stored in a JSON/SQLite file — no vector DB; corpus is small. (Decision for you: see Open questions.)
- **Hybrid retrieval with RRF** because lexical wins on exact terms ("$500", "24 hours") and dense wins on paraphrase; the eval decides the default.
- **Refusal is deterministic first**: a relevance gate before generation saves tokens and prevents confident wrong answers. (The POC eval already caught this bug: one shared word, "company", made the mock answer an out-of-scope question.)
- Prompt layout: stable instructions + schema first, retrieved chunks next, question last (cache-friendly).

## Milestones

| # | Milestone | Deliverable | Done when |
|---|---|---|---|
| 0 | **POC (done)** | `app/rag.py`, CLI, 3 sample docs, 7-case eval | 5 offline tests pass; cited answer + refusal work |
| 1 | Ingestion | PDF support (`pypdf`, optional dep), content-hash cache, per-file errors, page numbers in citations | Re-ingest of unchanged folder does zero work; PDF chunks cite page |
| 2 | Web UI + API | `app/server.py`, `/api/ask`, `/api/ingest`; chat box, expandable cited chunks | 2-minute demo flow works in browser |
| 3 | Real embeddings | Embedding provider, batching, hash-skip, persisted index | Hybrid beats lexical-only on eval set (or we report that it doesn't) |
| 4 | LLM answers | OpenAI + Anthropic generation, structured output, citation validation, usage telemetry | Provider errors surface, never silently fall back to mock |
| 5 | Eval suite | 25+ questions on a larger sample corpus; hit@k, MRR, refusal precision, groundedness check; results table in README | `python3 -m unittest` + `python3 -m evals.report` |
| 6 | Polish | README, architecture notes, example prompts, screenshot, checklist, resume bullet | [Shipping checklist](../../../templates/PROJECT_CHECKLIST.md) complete |

Estimate: milestones 1–6 ≈ 2 weekends (matches the lab's iteration template).

## Risks

- **POC eval is weak evidence.** The sample corpus has ~8 chunks, so hit@4 = 1.00 means little. Milestone 5 fixes this with a bigger corpus.
- Hashed BoW "embeddings" have no semantic power; they only test plumbing. Real gains appear in milestone 3.
- Extractive mock answers are not real synthesis.
- Sending private documents to a provider: README must say so; mock/local stays the default.
- PDF extraction quality (tables, scans) varies; scanned/OCR PDFs are out of scope.

## Open questions for sign-off

1. **Providers**: OpenAI embeddings + your choice of generator, or Anthropic for generation (no Anthropic embeddings API)? Default proposal: OpenAI `text-embedding-3-small` + whichever generator is configured.
2. **Vector storage**: flat JSON/SQLite + brute-force cosine (proposed; simplest, fine to ~10k chunks) vs. a vector DB like Chroma/pgvector (more résumé keywords, more setup).
3. **PDF dependency**: allow one optional pip dependency (`pypdf`), breaking the "stdlib only" pattern of Projects 01/02?
4. **Corpus for the eval**: use synthetic sample docs, or some of your real (non-sensitive) notes?
5. Any scope to cut or add (e.g. conversation memory, reranking, multi-folder)?
