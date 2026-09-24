create extension if not exists pgcrypto;

create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ticker text not null,
  company_name text not null,
  analyzed_at timestamptz not null default now(),
  as_of_price numeric not null,
  skill_version text not null,
  data_mode text not null,
  score int not null,
  confidence int not null,
  verdict text not null,
  benchmark text not null,
  expected_return_12m_low numeric,
  expected_return_12m_high numeric,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists research_runs_ticker_analyzed_at_idx on research_runs (ticker, analyzed_at desc);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references research_runs(id) on delete cascade,
  claim_text text not null,
  source_url text not null,
  source_title text,
  source_tier int check (source_tier between 1 and 5),
  published_at timestamptz,
  retrieved_at timestamptz not null,
  as_of_date date,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists retrospective_results (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references research_runs(id) on delete cascade,
  horizon_days int not null check (horizon_days in (30,90,180,365)),
  evaluated_at timestamptz not null default now(),
  stock_return numeric not null,
  benchmark_return numeric not null,
  excess_return numeric not null,
  inside_predicted_range boolean,
  direction_correct boolean,
  absolute_error numeric,
  grade text,
  unique(research_run_id, horizon_days)
);
