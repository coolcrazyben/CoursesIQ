-- CoursesIQ Database Schema
-- Paste into: Supabase Dashboard > SQL Editor > New Query > Run
-- Source: ROADMAP.md Phase 1 deliverables + REQUIREMENTS.md INFRA-02, INFRA-03, INFRA-04

-- ===== TABLES =====

create table if not exists public.alerts (
  id               uuid        primary key default gen_random_uuid(),
  crn              text        not null,
  subject          text        not null,
  course_number    text        not null,
  course_name      text,
  phone_number     text        not null,
  email            text,
  school           text        not null default 'MSU',
  term_code        text        not null,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  sms_sent_at      timestamptz,
  sms_opted_out    boolean     not null default false,
  last_seats_avail integer,
  sms_sid          text,
  alert_reset_at   timestamptz
);

create table if not exists public.courses (
  crn              text        primary key,
  course_name      text,
  section          text,
  professor        text,
  seats_total      integer,
  seats_available  integer,
  last_checked     timestamptz
);

-- ===== ROW LEVEL SECURITY =====

alter table public.alerts  enable row level security;
alter table public.courses enable row level security;

-- alerts: anon role can INSERT new seat watch requests
-- No SELECT policy for anon — phone numbers are PII
create policy "anon_insert_alerts"
  on public.alerts
  for insert
  to anon
  with check (true);

-- courses: anon role can SELECT course info (not sensitive data)
-- Required for /api/course/[crn] route which uses the publishable-key server client
create policy "anon_select_courses"
  on public.courses
  for select
  to anon
  using (true);

-- Note: service_role bypasses RLS automatically (BYPASSRLS privilege in Postgres)
-- No explicit policy needed for service_role — admin.ts uses service_role for all
-- alert reads, seat updates, and sms_sent_at writes in the cron handler
