-- Nexa: shared online/last-active tracking for every user (seller and buyer).
-- Run the complete file in the Nexa Supabase SQL Editor.
-- This setup creates and uses only the shared user_presence table.

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx
  on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

drop policy if exists "Public can view Nexa user presence" on public.user_presence;
create policy "Public can view Nexa user presence"
  on public.user_presence
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users insert own Nexa presence" on public.user_presence;
create policy "Users insert own Nexa presence"
  on public.user_presence
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own Nexa presence" on public.user_presence;
create policy "Users update own Nexa presence"
  on public.user_presence
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.user_presence to anon, authenticated;
grant insert, update on public.user_presence to authenticated;
