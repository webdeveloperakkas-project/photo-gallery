-- Nexa seller online / last-active presence
-- Run this file in the Nexa Supabase SQL Editor only.

create table if not exists public.seller_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index if not exists seller_presence_last_seen_idx
  on public.seller_presence(last_seen_at desc);

alter table public.seller_presence enable row level security;

create or replace function public.is_approved_nexa_seller(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.asset_listings l
    where l.user_id = p_user_id and l.status = 'approved'
  );
$$;

revoke all on function public.is_approved_nexa_seller(uuid) from public;
grant execute on function public.is_approved_nexa_seller(uuid) to anon, authenticated;

drop policy if exists "Public can view approved Nexa seller presence" on public.seller_presence;
create policy "Public can view approved Nexa seller presence"
  on public.seller_presence for select to anon, authenticated
  using (public.is_approved_nexa_seller(user_id));

drop policy if exists "Sellers insert own Nexa presence" on public.seller_presence;
create policy "Sellers insert own Nexa presence"
  on public.seller_presence for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Sellers update own Nexa presence" on public.seller_presence;
create policy "Sellers update own Nexa presence"
  on public.seller_presence for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.seller_presence to anon, authenticated;
grant insert, update on public.seller_presence to authenticated;
