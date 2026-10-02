# Project 03: Ask My Documents

Ask questions about a folder of notes, text files and PDFs. Every answer cites the exact chunks it came from, and questions the documents can't answer are refused instead of guessed. Runs with the standard library in Mock mode (no key); OpenAI mode adds real embeddings and generated answers.

## Run

```bash
cd projects/03-ask-my-documents
python3 -m app.server            # http://127.0.0.1:8003
python3 -m app.cli "How many vacation days do I get?"
python3 -m app.cli "Who is the CEO?"        # refuses
```

Index your own folder: `DOCS_DIR=/path/to/notes python3 -m app.server`. PDFs need `pip install -r requirements-optional.txt`. For OpenAI, copy `.env.example` to `.env`, set `OPENAI_API_KEY`, pick **OpenAI** in the UI, and press **Index folder** once (this spends embedding credits; unchanged files are skipped next time). Provider errors are shown, never replaced by Mock output.

## What it teaches

RAG end to end: chunking, embeddings, hybrid (BM25 + vector) retrieval with rank fusion, grounded generation with citation validation, refusal behaviour, content-hash caching, and measuring retrieval instead of guessing.

## Evals

```bash
python3 -m unittest discover -s evals     # 24 offline tests, no key needed
python3 -m evals.report                   # lexical vs dense vs hybrid + answer scorecard
python3 -m evals.report --provider openai # same, with real embeddings and answers
```

Mock results on 27 questions (24 answerable, 3 not) over 10 synthetic documents:

| retrieval | hit@4 | MRR |
|---|---|---|
| keyword | 1.00 | 1.00 |
| embedding (hashed stand-in) | 1.00 | 0.94 |
| hybrid | 1.00 | 1.00 |

End to end (mock): 0.83 answers correct, 1.00 of unanswerable questions refused. **Caveats:** the corpus is small (25 chunks) and its questions share vocabulary with the text, so retrieval scores are near-ceiling and don't separate the methods; the refusal threshold was tuned on these same questions; and OpenAI numbers have not been measured yet because no API key was available during the build. The OpenAI code paths are covered by tests against a stubbed API only.

## Limits and cost

See [architecture notes](docs/ARCHITECTURE.md). No scanned PDFs, reranking, or conversation memory. Sending documents to OpenAI shares their text with that provider; use Mock for anything sensitive. See the lab's [cost standard](../../docs/COST_OPTIMIZATION.md).
