create table if not exists public.lead_captures (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null,
  first_name   text,
  major        text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  page_slug    text,
  created_at   timestamptz not null default now()
);
create index on public.lead_captures(email);
alter table public.lead_captures enable row level security;
