-- Nexa public marketplace read-only view.
-- Run ONLY in the Nexa Supabase SQL Editor (never TaskBridge).
-- Only approved listings and explicitly selected public search fields are exposed.
-- Private listing_data, evidence files, KYC details and admin review notes are never exposed.

create or replace view public.marketplace_public_listings
with (security_barrier = true)
as
select
  l.id,
  l.title,
  l.category,
  l.summary,
  l.asking_price,
  l.price_currency,
  l.submitted_at,
  max(d.value) filter (where d.key = 'country') as country,
  max(d.value) filter (where d.key = 'financial_currency') as financial_currency,
  max(case
    when d.key = 'monthly_traffic'
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_visitors,
  max(case
    when d.key = 'monthly_revenue'
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_revenue,
  max(case
    when d.key = 'followers'
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as total_followers
from public.asset_listings l
left join lateral (
  select
    item->>'key' as key,
    item->>'value' as value
  from jsonb_array_elements(
    case
      when jsonb_typeof(l.listing_data->'details') = 'array'
      then l.listing_data->'details'
      else '[]'::jsonb
    end
  ) as details(item)
) d on true
where l.status = 'approved'
group by
  l.id, l.title, l.category, l.summary, l.asking_price,
  l.price_currency, l.submitted_at;

grant select on public.marketplace_public_listings to anon, authenticated;
