-- Nexa public marketplace read-only view.
-- Run ONLY in the Nexa Supabase SQL Editor (never TaskBridge).
-- Exposes only approved listing fields safe for public browsing.
-- Seller/admin private listing_data and review notes are deliberately excluded.

create or replace view public.marketplace_public_listings
with (security_barrier = true)
as
select
  id,
  title,
  category,
  summary,
  asking_price,
  price_currency,
  submitted_at
from public.asset_listings
where status = 'approved';

grant select on public.marketplace_public_listings to anon, authenticated;
