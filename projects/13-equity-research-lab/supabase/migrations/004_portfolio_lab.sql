begin;
create table if not exists public.equity_portfolio_snapshots (
 id text primary key,
 owner_hash text not null check(length(owner_hash)=64),
 created_at timestamptz not null,
 payload jsonb not null
);
create index if not exists equity_portfolio_owner_date on public.equity_portfolio_snapshots(owner_hash,created_at desc);
alter table public.equity_portfolio_snapshots enable row level security;
revoke all on public.equity_portfolio_snapshots from anon,authenticated;
grant select,insert on public.equity_portfolio_snapshots to service_role;
commit;
