# Cost and Prompt Caching Standard

Use this checklist in every `applied-ai-lab` project that calls a model or paid tool.

## Required defaults

1. Put stable instructions, tool definitions, schemas, and reusable reference material first. Put the user's changing input last.
2. Give each OpenAI workflow a stable, versioned `prompt_cache_key`, such as `applied-ai-lab:project-name:v1`. Change the version when the stable prefix changes materially.
3. Enable Anthropic automatic caching with top-level `cache_control: {"type": "ephemeral"}`. Use the default 5-minute lifetime unless measured traffic justifies the more expensive 1-hour write.
4. Return provider usage metadata: uncached input, cached input, cache-write, and output tokens. A cache setting is only useful when this data shows hits.
5. Cap input length, source count, and output tokens at the API boundary. Client-side limits are only a convenience.
6. Use structured outputs to avoid parsing retries. Validate outputs locally and do not call a second model for work deterministic code can perform.
7. Default to the lowest-cost model that passes the project's evals. Escalate to a larger model only for cases that need it.
8. Keep Mock mode for development, screenshots, UI work, and deterministic evals.
9. Disable submit controls while a request is running. Consider an application response cache for repeated identical, non-sensitive requests.
10. Set provider spend limits and alerts in production. Add per-user quotas and rate limits before public access.

## How caching works here

Prompt caching reuses model processing for an identical prompt **prefix**. It does not reuse a previous answer. Project 01 uses a stable workflow key and provider caching. Project 02 places a reusable source packet before the research question, so follow-up questions against the same sources have a better chance of a cache hit.

Short requests may be below a provider's minimum cacheable length. Do not pad prompts just to reach a threshold without measuring total cost. Cache writes can also cost more than ordinary input, so a one-off prompt may cost slightly more with explicit caching and save nothing later.

OpenAI reports cache data under `usage.input_tokens_details`; Anthropic reports `cache_creation_input_tokens` and `cache_read_input_tokens`. The apps normalize these to:

```json
{
  "input_tokens": 0,
  "cached_input_tokens": 0,
  "cache_write_tokens": 0,
  "output_tokens": 0
}
```

## Tool-cost controls

- Search: start with narrow queries, cap result count, deduplicate URLs, and stop when evidence is sufficient.
- RAG: retrieve a small top-k set, enforce a context budget, and rerank before generation when the corpus is large.
- Agents: cap steps, tool calls, elapsed time, and per-run spend; detect repeated tool arguments.
- Evals: run deterministic checks first, sample model-graded evals, and use provider batch pricing for non-urgent suites when available.
- Images/audio: resize or compress before upload, use the lowest adequate detail/quality, and cache derived artifacts by content hash.
- Embeddings: chunk once, hash content, skip unchanged chunks, and batch requests.

## Production isolation

For a multi-user app, derive a stable cache key from an internal tenant or user ID rather than an email address. This separates cache accounting and reduces cross-user cache probing. Never put an API key, email address, source text, or other private content into a cache key.

## Provider references

- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
