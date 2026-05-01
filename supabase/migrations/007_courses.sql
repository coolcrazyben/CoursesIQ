-- All unique courses per term, sourced from Banner SSB.
-- Populated by scripts/sync-courses.ts each semester.
drop table if exists public.courses cascade;

create table public.courses (
  id            uuid        primary key default gen_random_uuid(),
  subject       text        not null,
  course_number text        not null,
  title         text,
  term_code     text        not null,
  created_at    timestamptz not null default now(),
  unique (subject, course_number, term_code)
);

create index on public.courses (term_code, subject, course_number);
create index on public.courses using gin (to_tsvector('english', coalesce(title, '') || ' ' || subject || ' ' || course_number));

alter table public.courses enable row level security;
create policy "anon_select_courses" on public.courses
  for select to anon using (true);
