# Production Deployment: Vercel

This folder is a production-ready deployment target for Project 01.

It exposes:

```text
GET  /
POST /api/run
```

## Why This Shape

The browser never receives OpenAI or Anthropic API keys. It sends the user's prompt to `/api/run`, and the serverless function calls the selected model provider using environment variables stored by the hosting platform.

```text
User browser
  -> Vercel static UI
  -> Vercel /api/run serverless function
  -> OpenAI or Anthropic
```

## Vercel Setup

When importing the GitHub repo into Vercel, set:

```text
Framework Preset: Other
Root Directory: projects/01-personal-chief-of-staff/deploy/vercel
Build Command: none
Output Directory: public
```

Add these environment variables in Vercel Project Settings:

```text
OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY
ANTHROPIC_MODEL=claude-sonnet-4-5
MAX_OUTPUT_TOKENS=1200
```

Only add keys for providers you want to enable.

## Local API Test

From this folder:

```bash
node --check api/run.mjs
```

That checks the function file parses. Full serverless routing is handled by Vercel.

## Production Controls To Add Later

- Authentication.
- Per-user rate limits.
- Monthly usage quotas.
- Request logs with redaction.
- Saved analysis history.
- Stripe billing for paid tiers.

## Cost controls

The endpoint uses stable prompt-cache prefixes, enables Anthropic automatic caching, caps requests at 2,000 characters, caps model output, and returns provider token/cache usage inside `tool_results.provider_usage`. A short prompt can fall below a provider's cache threshold, so confirm savings from the usage fields rather than assuming every request is a cache hit.
