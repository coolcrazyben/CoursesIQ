create table if not exists public.professors (
  id               uuid        primary key default gen_random_uuid(),
  name_normalized  text        not null unique,  -- lowercased, trimmed
  name_display     text,
  rmp_id           text,
  rating           numeric(2,1),     -- e.g. 4.2
  num_ratings      integer,
  difficulty       numeric(2,1),
  would_take_again integer,          -- percentage 0-100
  school_id        text default '602', -- MSU's RMP school ID
  updated_at       timestamptz not null default now()
);

create index on public.professors (name_normalized);

alter table public.professors enable row level security;
create policy "anon_select_professors" on public.professors
  for select to anon using (true);
