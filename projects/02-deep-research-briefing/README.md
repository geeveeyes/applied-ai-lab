# Project 02: Deep Research Briefing Agent

Turn a research question and 1-6 source excerpts into a concise, cited briefing. The app shows a research plan, findings tied to source IDs, counterpoints, next steps, and a confidence critique. It runs locally with Python's standard library; no install or API key is needed for Mock mode.

## Run

```bash
cd projects/02-deep-research-briefing
python3 -m app.server
```

Open [http://127.0.0.1:8002](http://127.0.0.1:8002). Choose **Load example**, then **Generate briefing** for a quick demo.

To use a model, add your key to a local `.env` (copy `.env.example`) or export it in the same terminal before starting the server. Select OpenAI or Anthropic in the UI. The keys stay on the local server and are never sent to the browser. Model calls use your API credits. Provider errors appear in the UI; the app does not silently substitute Mock output.

## What it teaches

- Plan, synthesize, and critique as separate, visible stages of a research workflow.
- Source IDs and citation validation: findings with invalid or missing source IDs are discarded.
- A deterministic source audit that distinguishes linked domains from unlinked notes.
- Provider abstraction with the same output contract for OpenAI, Anthropic, and Mock.
- Offline evals for citation integrity and input validation.

## Scope and limits

This first version uses **user-supplied source excerpts**. It does not fetch URLs, search the web, check publication dates, or verify whether a pasted excerpt matches a linked page. A link is only a source reference. Mock mode extracts sentences and intentionally gives low confidence; it is a workflow demo, not research analysis. The app accepts six sources to keep cost and latency bounded. Avoid putting confidential material into model-backed requests unless your provider setup permits it.

## Evals

```bash
python3 -m unittest discover -s evals -v
```

The tests cover the source and citation contract offline. To review actual model quality, run the example through both providers and compare whether claims are supported by the pasted notes.

See [architecture notes](docs/ARCHITECTURE.md) and [example prompts](docs/EXAMPLE_PROMPTS.md).

## Next weekend

Add a source collection step with a search connector and fetched excerpts, recording the URL, title, date, and retrieval time. Then add a human review step for each claim before presenting the brief as verified research.
