create table if not exists public.referrals (
  id               uuid        primary key default gen_random_uuid(),
  referrer_user_id uuid        not null references auth.users(id) on delete cascade,
  referrer_code    text        not null unique,
  referred_email   text,
  status           text        not null default 'pending',
  created_at       timestamptz not null default now()
);
create index on public.referrals(referrer_code);
create index on public.referrals(referrer_user_id);
alter table public.referrals enable row level security;
create policy "users_select_own" on public.referrals
  for select using (referrer_user_id = auth.uid());
