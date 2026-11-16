-- Nexa: move activity tracking from seller-only to all user accounts.
-- Run this file in the Nexa Supabase SQL Editor.
-- The old seller_presence table is intentionally retained during migration.

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx
  on public.user_presence(last_seen_at desc);

alter table public.user_presence enable row level security;

drop policy if exists "Public can view Nexa user presence" on public.user_presence;
create policy "Public can view Nexa user presence"
  on public.user_presence for select to anon, authenticated
  using (true);

drop policy if exists "Users insert own Nexa presence" on public.user_presence;
create policy "Users insert own Nexa presence"
  on public.user_presence for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own Nexa presence" on public.user_presence;
create policy "Users update own Nexa presence"
  on public.user_presence for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.user_presence to anon, authenticated;
grant insert, update on public.user_presence to authenticated;

-- Preserve existing sellers' last activity when moving to the shared table.
insert into public.user_presence (user_id, last_seen_at)
select user_id, last_seen_at
from public.seller_presence
on conflict (user_id) do update
set last_seen_at = greatest(
  public.user_presence.last_seen_at,
  excluded.last_seen_at
);
