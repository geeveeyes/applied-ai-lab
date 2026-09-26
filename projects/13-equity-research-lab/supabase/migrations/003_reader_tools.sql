begin;
alter table public.equity_snapshots add column if not exists deleted_at timestamptz;
revoke update on public.equity_snapshots from service_role;
grant update(deleted_at) on public.equity_snapshots to service_role;
create table if not exists public.equity_web_research (
  research_id text primary key references public.equity_snapshots(id),
  owner_hash text not null,
  status text not null check (status in ('pending','complete','failed')),
  payload jsonb,
  updated_at timestamptz not null default now()
);
alter table public.equity_web_research enable row level security;
revoke all on public.equity_web_research from anon, authenticated;
grant select, insert, update on public.equity_web_research to service_role;
create or replace function public.equity_claim_web_research(report_id text, workspace_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare existing public.equity_web_research; today date := (now() at time zone 'UTC')::date;
begin
  perform pg_advisory_xact_lock(hashtext('equity_web_research_budget'));
  if not exists(select 1 from public.equity_snapshots where id=report_id and owner_hash=workspace_hash and deleted_at is null) then return 'unavailable'; end if;
  select * into existing from public.equity_web_research where research_id=report_id;
  if existing.status='complete' then return 'pending'; end if;
  if existing.status='pending' and existing.updated_at > now()-interval '3 minutes' then return 'pending'; end if;
  if coalesce((select requests from public.equity_provider_usage where provider='web_research' and day=today),0)>=20 or
     coalesce((select requests from public.equity_provider_usage where provider='web_workspace:'||workspace_hash and day=today),0)>=3 then return 'limit'; end if;
  insert into public.equity_provider_usage(provider,day,requests) values('web_research',today,1),('web_workspace:'||workspace_hash,today,1)
  on conflict(provider,day) do update set requests=equity_provider_usage.requests+1;
  insert into public.equity_web_research(research_id,owner_hash,status,updated_at) values(report_id,workspace_hash,'pending',now())
  on conflict(research_id) do update set status='pending',updated_at=now();
  return 'claimed';
end;
$$;
revoke all on function public.equity_claim_web_research(text,text) from public, anon, authenticated;
grant execute on function public.equity_claim_web_research(text,text) to service_role;
commit;
