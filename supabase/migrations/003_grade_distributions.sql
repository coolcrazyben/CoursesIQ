create table if not exists public.grade_distributions (
  id             uuid        primary key default gen_random_uuid(),
  subject        text        not null,
  course_number  text        not null,
  section        text,
  professor      text,
  term           text        not null,  -- e.g. "Spring 2025"
  term_code      text,                  -- e.g. "202510"
  a_count        integer,
  b_count        integer,
  c_count        integer,
  d_count        integer,
  f_count        integer,
  w_count        integer,
  total_students integer,
  avg_gpa        numeric(3,2),
  created_at     timestamptz not null default now()
);

create index on public.grade_distributions (subject, course_number);
create index on public.grade_distributions (professor);

alter table public.grade_distributions enable row level security;
create policy "anon_select_grades" on public.grade_distributions
  for select to anon using (true);
