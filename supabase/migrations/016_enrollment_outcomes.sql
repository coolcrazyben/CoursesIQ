do $$ begin
  if not exists (select 1 from pg_type where typname = 'outcome_type') then
    create type public.outcome_type as enum ('yes', 'no', 'alternative');
  end if;
end $$;

create table if not exists public.enrollment_outcomes (
  id          uuid         primary key default gen_random_uuid(),
  alert_id    uuid         not null references public.alerts(id) on delete cascade,
  outcome     public.outcome_type not null,
  recorded_at timestamptz  not null default now()
);
create index on public.enrollment_outcomes(alert_id);
alter table public.enrollment_outcomes enable row level security;
create policy "users_select_own" on public.enrollment_outcomes
  for select using (
    alert_id in (select id from public.alerts where email = auth.email())
  );
