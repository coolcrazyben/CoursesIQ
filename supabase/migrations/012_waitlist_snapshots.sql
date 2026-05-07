-- Tracks waitlist position changes over time per alert.
-- Populated by PATCH /api/alerts whenever the user updates their position.
create table if not exists public.waitlist_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  alert_id    uuid        not null references public.alerts(id) on delete cascade,
  position    integer     not null,
  total       integer,
  recorded_at timestamptz not null default now()
);

create index if not exists waitlist_snapshots_alert_id_idx
  on public.waitlist_snapshots(alert_id, recorded_at desc);

alter table public.waitlist_snapshots enable row level security;

-- Users can only read their own snapshots (join through alerts)
create policy "users_select_own_snapshots" on public.waitlist_snapshots
  for select using (
    alert_id in (
      select id from public.alerts
      where email = auth.email()
    )
  );
