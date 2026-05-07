-- Daily enrollment snapshots for tracked CRNs.
-- Populated by the /api/cron/snapshot-enrollment cron job.
-- Used to calculate fill velocity ("filling 3 seats/day") and predict fill dates.
create table if not exists public.enrollment_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  crn             text        not null,
  term_code       text        not null,
  seats_available integer     not null,
  seats_total     integer     not null,
  wait_count      integer     not null default 0,
  snapshot_at     timestamptz not null default now()
);

create index if not exists enrollment_snapshots_crn_term_idx
  on public.enrollment_snapshots(crn, term_code, snapshot_at desc);

alter table public.enrollment_snapshots enable row level security;

-- Read-only for authenticated users (service role writes via cron)
create policy "auth_select_snapshots" on public.enrollment_snapshots
  for select to authenticated using (true);
