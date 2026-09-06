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
