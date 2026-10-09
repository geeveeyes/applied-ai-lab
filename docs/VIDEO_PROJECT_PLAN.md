# Portfolio Plan: Six Industry-Relevant Projects

Source: a talk on AI engineering portfolios by a former AWS tech lead who interviewed 300+ AI engineers. Its thesis: keywords on a resume are not enough. Projects must show **decisions, architecture trade-offs, and evals**, and resemble what companies ship.

Every project below follows the lab rules (mock mode, README, architecture notes, offline evals, cost telemetry) and adds the talk's requirement: **a decision log** (`docs/DECISIONS.md`) recording what was chosen, what the numbers said, and why. That log is the raw material for resume bullets and interview answers.

## The six projects and where they land

| Talk # | Project | Lab # | Complexity | Core decisions to document | Headline evals |
|---|---|---|---|---|---|
| 2 | **Enterprise search** (hybrid retrieval, reranking, enforced citations) | **03** (rescoped from "Ask My Documents") | Medium | chunking strategy, keyword vs semantic vs hybrid, rerank on/off, citation enforcement, latency | context recall/precision, MRR, citation validity, refusal on unanswerable, p95 latency |
| 1 | **Document intelligence pipeline** (messy docs to validated JSON) | **14** (new) | Medium | parser/extractor choice vs cost, prompt variation handling, schema validation | per-field precision/recall |
| 3 | **Conversation intelligence** (transcribe, diarize, structured summary) | **07** (rescoped from "Meeting-to-Decisions") | Medium-High | transcript-first design, speaker attribution, judge calibration | WER/DER on sample, LLM-judge rubric, agreement with human labels |
| 5 | **Multi-step autonomous agent** (ReAct, tracing, guardrails, human-in-the-loop) | **15** (new) | High | step/tool budgets, approval gates for irreversible actions, trace design | task success, tool accuracy, escalation rate, pass@k |
| 4 | **Sovereign AI engine** (self-hosted open-weight model, LoRA/QLoRA, quantization, serving) | **16** (new) | Highest (needs GPU/Colab) | baseline gap vs frontier API, quantization cost, volume crossover | quality vs frontier baseline, tokens/sec, cost crossover |
| 6 | **Work backwards** (build for target companies) | **17** (new) | Process | which companies, which public problems | n/a (a repeatable research prompt and project briefs) |

## Build order

The goal is to get one or two medium projects into solid shape first, starting with the indexing project.

1. **03 Enterprise Search.** Build first. Retrieval is the reusable infrastructure for the rest.
2. **14 Document Intelligence Pipeline.** Second medium project. It reuses the eval and provider patterns from 03.
3. **07 Conversation Intelligence.** Text-transcript-first version, with diarized transcripts as input and the audio path as an adapter.
4. **15 Multi-step Support Agent.** Builds on the eval harness and tracing patterns from the earlier projects.
5. **17 Work-Backwards.** A docs-and-prompt deliverable that can be done at any time. Best run before choosing a final showcase project.
6. **16 Sovereign AI Engine.** Last. It needs GPU time. The repo gets the harness (baseline, eval, cost-crossover calculator) first, and the training runs happen in Colab.

## Constraints and honest scoping

- The sandbox has no access to public datasets. Each project ships a **small synthetic corpus shaped like the recommended public dataset** (Enterprise RAG Bench, CUAD, AMI, tau-bench, BillSum) plus a loader and instructions for swapping in the real one. Metrics on synthetic data demonstrate the harness, not real-world performance, and the READMEs say so.
- Everything runs offline in mock mode with the Python standard library. Real model and embedding providers are optional via env keys.
- Mock components that stand in for a model (for example the offline "semantic" embedder) are labeled as stand-ins.
