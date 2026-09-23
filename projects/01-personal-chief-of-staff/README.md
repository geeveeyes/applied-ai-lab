# Project 01: Personal Chief of Staff

A small local AI app that turns a messy goal into a clear plan: priorities, risks, next actions, open questions, and a confidence score.

This is the first project in Venkat's `applied-ai-lab`. It is intentionally compact so it can be finished, demoed, and extended over future weekends.

## What It Teaches

- Provider abstraction across OpenAI and Anthropic.
- Structured outputs for predictable downstream UI.
- Tool use through a deterministic local priority scoring tool.
- Minimal eval harness design.
- Product framing for a resume-friendly AI app.

## Demo

Ask questions like:

```text
I am considering switching from a stable big tech role to an AI startup. Help me decide what matters this week.
```

The app returns:

- Executive summary.
- Ranked priorities.
- Risks.
- Next actions.
- Questions to answer.
- Tool results used by the model.

## Quick Start

No install is required for mock mode.

```bash
python3 -m app.server
```

Open `http://localhost:8000`.

If clicking **Run analysis** does not show output, check these first:

- Use `python3 -m app.server`, not `python3 -m http.server`.
- Open `http://127.0.0.1:8000` or `http://localhost:8000`, not the `index.html` file directly.
- Start with the `Mock` provider. OpenAI and Anthropic require API keys.
- If port `8000` is busy, run with another port:

```bash
PORT=8010 python3 -m app.server
```

## Optional Model Setup

Create a `.env` file or export environment variables:

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
```

Or create a local `.env` file by copying `.env.example` and filling in the values. The app loads `.env` automatically when it starts.

Then choose a provider in the UI.

Defaults:

- OpenAI model: `gpt-4o-mini`
- Anthropic model: `claude-sonnet-4-5`

You can override them:

```bash
export OPENAI_MODEL="gpt-4o-mini"
export ANTHROPIC_MODEL="claude-sonnet-4-5"
export MAX_OUTPUT_TOKENS="1200"
```

If OpenAI says the model does not exist or you do not have access, list models available to your key:

```bash
python3 scripts/list_openai_models.py
```

If no API key is present, the app automatically falls back to a local mock provider.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Example Prompts

See [docs/EXAMPLE_PROMPTS.md](docs/EXAMPLE_PROMPTS.md).

## Eval Harness

Run:

```bash
python3 evals/run_evals.py
```

The eval harness currently validates schema shape and basic answer quality. It is meant to become the shared pattern for later projects in the lab.

## Cost controls

The app limits prompts to 2,000 characters and model output to 1,200 tokens by default. OpenAI requests use a stable prompt cache key; Anthropic requests enable automatic five-minute prompt caching. Provider usage, including cache reads and writes, appears in **Tool results**. Short requests may be below the provider's cacheable length, so use those measurements to confirm whether caching helped.

See the lab-wide [cost and prompt caching standard](../../docs/COST_OPTIMIZATION.md).

## Resume Bullet

```text
Built a local Personal Chief of Staff agent using provider-agnostic LLM calls, structured JSON outputs, deterministic tool use, and a lightweight eval harness to convert ambiguous goals into ranked priorities and next actions.
```
