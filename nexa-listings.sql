-- Nexa marketplace listing submissions and admin review
-- Run ONLY in the Nexa Supabase project SQL Editor (not TaskBridge).
-- Admin access uses the existing public.has_role(user_id, 'admin'::public.app_role) helper.

create table if not exists public.asset_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  summary text not null default '',
  asking_price numeric(14,2) not null check (asking_price > 0),
  price_currency text not null check (price_currency in ('USD','EUR','GBP','BDT')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  listing_data jsonb not null default '{}'::jsonb,
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_listings_user_submitted_idx
  on public.asset_listings(user_id, submitted_at desc);
create index if not exists asset_listings_status_submitted_idx
  on public.asset_listings(status, submitted_at desc);

alter table public.asset_listings enable row level security;

drop policy if exists "Sellers read own Nexa listings" on public.asset_listings;
create policy "Sellers read own Nexa listings"
  on public.asset_listings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins read all Nexa listings" on public.asset_listings;
create policy "Admins read all Nexa listings"
  on public.asset_listings for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Sellers submit pending Nexa listings" on public.asset_listings;
create policy "Sellers submit pending Nexa listings"
  on public.asset_listings for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending' and reviewed_by is null and reviewed_at is null);

drop policy if exists "Sellers update own pending Nexa asking price" on public.asset_listings;
create policy "Sellers update own pending Nexa asking price"
  on public.asset_listings for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Admins review Nexa listings" on public.asset_listings;
create policy "Admins review Nexa listings"
  on public.asset_listings for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Sellers delete own Nexa listings" on public.asset_listings;
create policy "Sellers delete own Nexa listings"
  on public.asset_listings for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.asset_listings to authenticated;
grant update (asking_price) on public.asset_listings to authenticated;
grant update (status, admin_note, reviewed_by, reviewed_at, updated_at) on public.asset_listings to authenticated;
-- Keep update timestamps current for both seller price edits and admin review actions.
create or replace function public.set_asset_listings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_asset_listings_updated_at on public.asset_listings;
create trigger set_asset_listings_updated_at
before update on public.asset_listings
for each row execute function public.set_asset_listings_updated_at();
