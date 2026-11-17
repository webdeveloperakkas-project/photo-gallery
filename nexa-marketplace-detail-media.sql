-- Monetization status: null is retained for older listings until sellers update them.
alter table public.asset_listings
  add column if not exists monetization_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='asset_listings_monetization_status_check'
      and conrelid='public.asset_listings'::regclass
  ) then
    alter table public.asset_listings
      add constraint asset_listings_monetization_status_check
      check (monetization_status is null or monetization_status in ('monetized','not_monetized'));
  end if;
end $$;

-- Nexa marketplace public asset detail + image storage
-- Seller payout preferences are stored as a comma-separated text value in listing_data.details.
-- Supported labels include Bank Transfer, Payoneer, Wise, PayPal, bKash, Nagad and Rocket.
-- Only method names are exposed publicly; account numbers and payout credentials are never exposed.
-- Run ONLY in the Nexa Supabase SQL Editor.

insert into storage.buckets (id,name,public)
values ('asset-listing-media','asset-listing-media',true)
on conflict (id) do update set public=true;

drop policy if exists "Public can view Nexa listing media" on storage.objects;
create policy "Public can view Nexa listing media"
on storage.objects for select to anon,authenticated
using (bucket_id='asset-listing-media');

drop policy if exists "Sellers upload own Nexa listing media" on storage.objects;
create policy "Sellers upload own Nexa listing media"
on storage.objects for insert to authenticated
with check (
  bucket_id='asset-listing-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Sellers update own Nexa listing media" on storage.objects;
create policy "Sellers update own Nexa listing media"
on storage.objects for update to authenticated
using (
  bucket_id='asset-listing-media'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check (
  bucket_id='asset-listing-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Sellers delete own Nexa listing media" on storage.objects;
create policy "Sellers delete own Nexa listing media"
on storage.objects for delete to authenticated
using (
  bucket_id='asset-listing-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create or replace view public.marketplace_public_listings
with (security_barrier=true,security_invoker=false) as
select
  l.id,
  l.title,
  l.category,
  l.summary,
  l.asking_price,
  l.price_currency,
  l.submitted_at,
  max(d.value) filter (where d.key='country') as country,
  max(d.value) filter (where d.key='financial_currency') as financial_currency,
  max(case
    when l.category in ('Website','E-commerce')
     and d.key='monthly_traffic'
     and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_visitors,
  max(case
    when d.key='monthly_revenue'
     and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_revenue,
  max(case
    when l.category in ('Facebook Page','Instagram Account','TikTok Account','X Account')
     and d.key='followers'
     and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as total_followers,
  max(case
    when l.category='YouTube Channel'
     and d.key in ('subscribers','followers')
     and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as total_subscribers,
  max(d.value) filter (where d.key='asset_type') as subcategory,
  max(case
    when d.key='monthly_expenses'
     and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_expenses,
  max(case
    when d.key='monthly_profit'
     and d.value ~ '^-?[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_profit,
  l.user_id as seller_id,
  coalesce(
    nullif(trim(concat_ws(' ',
      u.raw_user_meta_data->>'first_name',
      u.raw_user_meta_data->>'last_name'
    )),''),
    u.raw_user_meta_data->>'display_name',
    'Nexa Seller'
  ) as seller_name,
  u.created_at as seller_member_since,
  (
    select count(*)
    from public.asset_listings sl
    where sl.user_id=l.user_id and sl.status='approved'
  ) as seller_total_listings,
  l.listing_data->>'cover_image_path' as cover_image_path,
  l.listing_data->>'logo_image_path' as logo_image_path,
  coalesce(l.listing_data->'gallery_image_paths','[]'::jsonb) as gallery_image_paths,
  max(d.value) filter (where d.key='description') as full_description,
  coalesce((
    select jsonb_agg(x.item order by x.ordinality)
    from jsonb_array_elements(
      case
        when jsonb_typeof(l.listing_data->'details')='array'
        then l.listing_data->'details'
        else '[]'::jsonb
      end
    ) with ordinality as x(item,ordinality)
    where coalesce(x.item->>'key','') not in (
      'verification_notes','proof_files','ownership_confirmed',
      'accuracy_confirmed','policy_agreed','payout_methods',
      'transfer_notes','cover_image','logo_image','additional_images'
    )
  ),'[]'::jsonb) as public_details,
  nullif(trim(max(d.value) filter (where d.key='payout_methods')), '') as preferred_payment_methods,
  (
    select count(*)
    from public.asset_listings all_seller_listings
    where all_seller_listings.user_id=l.user_id
  ) as seller_all_listings,
  l.monetization_status
from public.asset_listings l
left join auth.users u on u.id=l.user_id
left join lateral (
  select item->>'key' as key,item->>'value' as value
  from jsonb_array_elements(
    case
      when jsonb_typeof(l.listing_data->'details')='array'
      then l.listing_data->'details'
      else '[]'::jsonb
    end
  ) as details(item)
) d on true
where l.status='approved'
group by
  l.id,l.title,l.category,l.summary,l.asking_price,l.price_currency,
  l.submitted_at,l.user_id,u.raw_user_meta_data,u.created_at,l.listing_data,l.monetization_status;

-- A view is not an RLS-enabled table. Keep this view read-only and
-- expose it only to the public roles that need approved marketplace data.
revoke all on public.marketplace_public_listings from public, anon, authenticated;
grant select on public.marketplace_public_listings to anon, authenticated;


-- ---------------------------------------------------------------------
-- SECURITY HARDENING: public API view uses SECURITY INVOKER.
-- Keep the privileged source view in a non-exposed schema and publish
-- only its already-sanitized result through a separate RLS-protected cache.
-- Do not expose the private schema through Supabase API settings.
-- ---------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  -- Preserve the current privileged source view outside the exposed public schema.
  if to_regclass('private.marketplace_public_listings') is null then
    if to_regclass('public.marketplace_public_listings') is null then
      raise exception 'Expected public.marketplace_public_listings source view was not found';
    end if;
    alter view public.marketplace_public_listings set schema private;
  end if;
end $$;

revoke all on private.marketplace_public_listings from public, anon, authenticated;

-- This table contains only the sanitized columns already selected by the
-- private source view. It intentionally contains no raw verification/KYC data.
create table if not exists public.marketplace_public_listing_cache
as select * from private.marketplace_public_listings with no data;

create unique index if not exists marketplace_public_listing_cache_id_uidx
  on public.marketplace_public_listing_cache(id);

alter table public.marketplace_public_listing_cache enable row level security;

drop policy if exists "Public can read sanitized Nexa marketplace cache"
  on public.marketplace_public_listing_cache;
create policy "Public can read sanitized Nexa marketplace cache"
  on public.marketplace_public_listing_cache
  for select to anon, authenticated
  using (true);

revoke all on public.marketplace_public_listing_cache from public, anon, authenticated;
grant select on public.marketplace_public_listing_cache to anon, authenticated;

-- Populate/refresh the sanitized cache from the private source view.
truncate table public.marketplace_public_listing_cache;
insert into public.marketplace_public_listing_cache
select * from private.marketplace_public_listings;

-- Keep the cache synchronized whenever a listing is submitted, edited,
-- approved, rejected, or deleted.
create or replace function private.sync_marketplace_public_listing_cache()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_id uuid;
begin
  if tg_op = 'DELETE' then
    target_id := old.id;
    delete from public.marketplace_public_listing_cache where id = target_id;
    return old;
  end if;

  target_id := new.id;
  delete from public.marketplace_public_listing_cache where id = target_id;

  insert into public.marketplace_public_listing_cache
  select * from private.marketplace_public_listings
  where id = target_id;

  return new;
end;
$$;

revoke all on function private.sync_marketplace_public_listing_cache() from public, anon, authenticated;

drop trigger if exists sync_marketplace_public_listing_cache
  on public.asset_listings;
create trigger sync_marketplace_public_listing_cache
after insert or update or delete on public.asset_listings
for each row execute function private.sync_marketplace_public_listing_cache();

-- Replace the exposed privileged view with a simple invoker-security view.
drop view if exists public.marketplace_public_listings;
create view public.marketplace_public_listings
with (security_invoker = true, security_barrier = true)
as
select * from public.marketplace_public_listing_cache;

revoke all on public.marketplace_public_listings from public, anon, authenticated;
grant select on public.marketplace_public_listings to anon, authenticated;
