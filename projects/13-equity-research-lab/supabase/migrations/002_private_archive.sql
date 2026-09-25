begin;
-- Additive migration. No existing research or application tables are modified.
create table if not exists public.equity_snapshots (
  id text primary key,
  owner_hash text not null check (length(owner_hash) = 64),
  ticker text not null,
  analyzed_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists equity_snapshots_owner_date on public.equity_snapshots(owner_hash, analyzed_at desc);
alter table public.equity_snapshots enable row level security;
revoke all on public.equity_snapshots from anon, authenticated;
grant select, insert on public.equity_snapshots to service_role;

create table if not exists public.equity_quote_cache (
  ticker text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.equity_quote_cache enable row level security;
revoke all on public.equity_quote_cache from anon, authenticated;
grant select, insert, update on public.equity_quote_cache to service_role;

create table if not exists public.equity_provider_usage (
  provider text not null,
  day date not null,
  requests integer not null default 0,
  primary key(provider, day)
);
alter table public.equity_provider_usage enable row level security;
revoke all on public.equity_provider_usage from anon, authenticated;
-- Global atomic cap across serverless instances; retain one request of headroom.
create or replace function public.equity_claim_alpha_request() returns boolean
language plpgsql security definer set search_path = public as $$
declare claimed integer;
begin
  insert into public.equity_provider_usage(provider, day, requests)
  values ('alpha_vantage', (now() at time zone 'UTC')::date, 1)
  on conflict(provider, day) do update set requests = equity_provider_usage.requests + 1
  where equity_provider_usage.requests < 24
  returning requests into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.equity_claim_alpha_request() from public, anon, authenticated;
grant execute on function public.equity_claim_alpha_request() to service_role;

commit;
