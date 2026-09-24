# Equity Research Lab Architecture

## Goal

Keep research logic, evidence providers, brokerage context, storage, and retrospective grading separable so the product can evolve without rewriting the UI.

## Components

```text
Next.js UI
  -> research engine
      -> deterministic scorecard
      -> SEC fundamentals adapter
      -> analyst-data adapter
      -> options-data adapter
      -> future news/price/positioning adapters
  -> archive layer
      -> localStorage in MVP
      -> Supabase/Postgres in production
  -> retrospective evaluator
      -> 30d / 90d / 180d / 365d grading
```

## Design rules

1. Business quality, valuation, expectations, and trade timing are separate concepts.
2. Provider responses are normalized before scoring.
3. Primary-source evidence wins when sources conflict.
4. Every archived claim carries retrieval/as-of metadata where available.
5. Historical evaluation may only use information available at the original research timestamp.
6. Options analysis is a separate decision layer and requires live IV/Greeks/liquidity data.
7. Brokerage credentials never belong in the browser bundle.
8. Deterministic scoring, return math, and grading stay outside the LLM.

## Storage

The MVP uses browser storage for quick demos. `supabase/migrations/001_init.sql` defines the durable schema for research runs, sourced claims, notes, and retrospectives.

## Future production boundary

A production version should add server-side provider calls, authentication, per-user authorization, rate limits, provider spend controls, scheduled retrospective jobs, and audit logs.
