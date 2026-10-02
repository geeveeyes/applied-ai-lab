# Lab Portal + Ask My Documents (hosted): Plan

Status: **POC done (Mock mode, no cloud services). Awaiting sign-off before milestones P1–P5.**

## Objective

One private website for the whole lab, starting with Project 03. You open a URL, sign in, upload documents, and ask questions with cited answers. Nothing to install, no `.env` file on your laptop: keys live only in Vercel.

## Decisions already made (by you)

- Lab-wide portal (this app) with a page per project.
- Supabase for documents, chunks and embeddings (pgvector).
- OpenAI for embeddings and answers.
- Project 13 (brokerage-connected) stays a **separate Vercel project**; the portal only links to it.

## Architecture

```
Browser -> Vercel (Next.js portal, protected)
           /                 project index
           /documents        upload, list, ask
           /api/documents/*  server-only routes
              -> lib/rag (TypeScript port of the Python core: chunk, BM25, hybrid, cited answer, refusal)
              -> Supabase: documents, chunks(embedding vector(1536)), spend ledger
              -> OpenAI: text-embedding-3-small, answer model (strict JSON schema)
```

- Retrieval: BM25 in TypeScript over the user's chunks plus pgvector cosine search, fused with reciprocal-rank fusion, same as Python.
- The Python app in `projects/03-ask-my-documents` stays as the offline reference and eval harness; `data/cases.json` is shared so both implementations are held to the same questions.

## What the POC proves

- Home page with project cards; Documents page; `/api/documents/ask` with validation limits.
- TypeScript port reproduces Python results on the shared 27-question set: hit@4 1.00, MRR 0.98 (hybrid), 0.83 answers correct, 3/3 unanswerable refused.
- `next build` passes; 6 unit tests pass; responses carry `X-Robots-Tag: noindex`.

## Milestones

| # | Milestone | Done when |
|---|---|---|
| P1 | **Deploy + protect**: Vercel project (root `projects/00-lab-portal`), Deployment Protection on All Deployments, `OPENAI_API_KEY`/Supabase vars set in Vercel | Signed-in URL shows the POC; unauthenticated visitors are blocked |
| P2 | **Supabase schema**: `documents`, `chunks` (pgvector + RLS), `usage_ledger`; migration in repo | Migration applies cleanly; service key used server-side only |
| P3 | **Upload + index**: `.md/.txt/.pdf` upload (size and count caps), server-side extraction, hash-skip, OpenAI embeddings in batches, per-file errors | Re-upload of unchanged file costs 0 tokens; PDF answers cite pages |
| P4 | **OpenAI answers + cost guard**: strict JSON schema, citation validation, `prompt_cache_key`, usage shown in UI, **daily request cap and spend ledger** enforced server-side (as in Project 13) | Provider errors surface; cap blocks request N+1 |
| P5 | **Eval + polish**: run `python3 -m evals.report --provider openai` and a TS equivalent on your own non-sensitive notes; README with real numbers, screenshots | Numbers in README come from real runs |

## Risks and open items

- **Auth**: Vercel Deployment Protection (as Project 13) only works on a Vercel team plan setting you already use; it is a single shared gate, not per-user accounts. Fine for you alone; revisit before sharing.
- **Your documents leave your machine** (Supabase + OpenAI). Only non-sensitive files; the UI will say so.
- **PDF parsing on Vercel**: needs a pure-JS parser (e.g. `pdfjs-dist`/`unpdf`), a new dependency; scanned PDFs unsupported.
- **Function limits**: Vercel request bodies are capped (~4.5 MB), so large PDFs need direct-to-Storage upload. P3 will start with a 4 MB per-file cap.
- **Two implementations** (Python + TypeScript) can drift; the shared eval cases are the guard.
- **Spend**: you created a shared OpenAI key. Recommend a separate OpenAI project key with a monthly cap for this deployment; I'd read `OPENAI_API_KEY` only on the server.
- Projects 01 and 02 are not migrated yet; they appear as "soon" cards.

## Sign-off questions

1. OK to create a **new Supabase project** for the lab portal (not reuse Project 13's, which holds research archives)?
2. OK to add `unpdf` (or similar) for PDF text extraction?
3. Which key should the deployment use: your shared `OPENAI_API_KEY`, or a new capped project key (recommended)?
4. Daily cap for hosted OpenAI use: 25 questions/day and 5 index runs/day as a starting point?
