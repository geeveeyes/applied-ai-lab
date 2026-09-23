# AI Project Shipping Checklist

## Product

- [ ] Demo completes in under two minutes.
- [ ] Mock mode works without credentials or paid calls.
- [ ] Error and empty states are visible.

## Cost

- [ ] Stable prompt content precedes dynamic input.
- [ ] OpenAI `prompt_cache_key` or Anthropic `cache_control` is configured where supported.
- [ ] Input characters/files/sources and output tokens have server-side limits.
- [ ] Token and cache usage is observable.
- [ ] Deterministic work happens outside the model.
- [ ] The default model passes evals at the lowest practical cost.
- [ ] Tool calls, agent steps, and retries have limits.

## Quality

- [ ] Structured output is validated before display.
- [ ] Three or more meaningful eval cases pass.
- [ ] Provider errors cannot be mistaken for successful model output.

## Production

- [ ] Secrets remain server-side and are excluded from Git.
- [ ] Authentication, per-user rate limits, quotas, and spend alerts are configured before public access.
- [ ] Cache keys use opaque tenant/user IDs and contain no private content.
