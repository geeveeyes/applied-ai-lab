# Equity Research Lab

A personal, evidence-first equity research system that does three things:

1. **Discover** companies worth deeper work.
2. **Research** business quality, expectations, valuation, analyst evidence, sentiment, risks, catalysts and options context.
3. **Learn** by freezing every prediction and grading it later against realized returns.

> This is a research tool, not an automated trading system. It does not place trades and should not be treated as personalized investment advice.

## What is already implemented

- Next.js + TypeScript portal with ticker entry and company research pages.
- Weighted 12-dimension research scorecard.
- Bull / base / bear cases and thesis-killer section.
- Analyst-intelligence table and live FMP/TipRanks adapter boundary.
- SEC company-facts adapter.
- Options strategy comparison boundary (shares / LEAPS / spread / no trade).
- Local immutable-ish browser archive for MVP development.
- Retrospective scoring logic and unit tests.
- Supabase/Postgres schema for durable research snapshots, sourced claims and 30/90/180/365-day retrospectives.
- Reusable skill specification in `skills/equity-research/SKILL.md`.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Demo mode works without API keys. Try `NVDA`, `MSFT`, or `AMZN`.

## Live-data mode

Set:

```bash
NEXT_PUBLIC_APP_MODE=live
SEC_USER_AGENT="Equity Research Lab you@example.com"
FMP_API_KEY="..."
```

The SEC adapter uses the SEC ticker map and Company Facts API. The FMP analyst adapter uses the current stable TipRanks search and price-target-consensus endpoints.

## Source policy

The skill ranks evidence:

1. SEC / company primary disclosures
2. Exchanges, FINRA, Cboe, OCC and other market infrastructure
3. Professional data providers
4. High-quality journalism
5. Crowd / social sentiment

Every stored claim should preserve source URL, retrieval time and (when known) publication/as-of time. Historical retrospectives must only use information available at the original analysis timestamp.

## Architecture

```text
Next.js UI
   |
Research Engine
   +-- SEC provider
   +-- Analyst provider (FMP / TipRanks)
   +-- Options provider adapter
   +-- future price/news/positioning providers
   |
Archive
   +-- localStorage (MVP)
   +-- Supabase/Postgres schema (production)
   |
Retrospective evaluator
   +-- 30d / 90d / 180d / 365d
```

## Robinhood

The standalone website deliberately does **not** embed brokerage credentials or auto-trading. Personal Robinhood context can be added through a server-side connector/adaptor for holdings, quotes, watchlists and orders. Options-chain analysis should remain provider-abstracted because a full chain/Greeks feed is distinct from the account connector.

## Next milestones

- Durable Supabase persistence from the app instead of localStorage.
- Historical-price provider + scheduled retrospective evaluator.
- Full fundamentals normalization and multi-year trend scoring.
- Reverse-DCF implementation.
- Analyst reliability calculation by sector and point-in-time date.
- Live options chain / Greeks / IV percentile and strategy comparison.
- News/catalyst ingestion with source-quality weighting.
- Authentication and per-user portfolios/notes.
- Deployment to Vercel.

## Tests

```bash
npm test
```

## Deployment

1. Create a Supabase project and run `supabase/migrations/001_init.sql`.
2. Add the environment variables to Vercel.
3. Import this GitHub repo into Vercel and deploy.

The app can also be deployed immediately in demo mode with no database or paid market-data keys.

## Applied AI Lab conventions

This project lives at `projects/13-equity-research-lab/` inside `applied-ai-lab`.

- Demo mode works without paid credentials.
- Deterministic scoring/backtest work stays outside the model.
- Live research providers are bounded behind adapters so the UI and archive do not depend on one vendor.
- Before public deployment, add authentication, rate limits, spend alerts, and durable per-user storage.
- Follow the lab-wide [cost and prompt caching standard](../../docs/COST_OPTIMIZATION.md).

## Example research prompts

- `Analyze NVDA as of today. Separate business quality from valuation and tell me what expectations are embedded in the price.`
- `Analyze AMZN and focus on earnings revisions, FCF quality, AWS expectations, valuation, and the strongest bear case.`
- `Compare buying MSFT shares with no-trade and defined-risk options structures, but only if live options data is available.`
