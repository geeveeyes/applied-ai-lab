# Architecture

```text
Browser form (question + excerpts)
  -> POST /api/research
  -> prepare(): validate + assign S1..S6 + source audit + plan
  -> provider: Mock | OpenAI Responses | Anthropic Messages
  -> normalize(): keep only findings with valid source IDs
  -> browser: answer, plan, findings, critique, source links, Markdown export
```

The browser renders response text using DOM `textContent`, so pasted source text is never interpreted as HTML. Model output is treated as data. The citation validator checks that IDs exist in this request, but cannot prove that a claim is actually supported by the cited passage. That semantic check is a future eval/human review task.

`prepare()` is the deterministic tool in this project: it counts sources/domains and creates a traceable research plan. Providers only synthesize from provided notes. This separation makes the same offline eval work even without credentials.

## Design choices

- Local Python standard library server keeps setup under a minute.
- Per-project `.env` avoids touching Project 01's deployment settings.
- No database or saved history in version 1.
- No automatic mock fallback after a paid provider error, so a failed call cannot look like successful research.
- OpenAI uses a strict JSON schema; Anthropic is prompted for the same shape and normalized before display.
- The reusable source packet precedes the changing research question to improve prompt-cache reuse.
- OpenAI uses a stable, versioned cache key; Anthropic enables automatic ephemeral caching.
- Provider usage is returned separately from the research result and displayed in the critique.
- Source text and output tokens have server-side limits.
