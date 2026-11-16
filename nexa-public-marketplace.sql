
-- Nexa public marketplace read-only view.
-- Run ONLY in the Nexa Supabase SQL Editor (never TaskBridge).
-- Exposes only approved listings and public marketplace statistics.
-- Uses view-owner permissions so approved public listings can be read despite seller-specific table RLS.

create or replace view public.marketplace_public_listings
with (security_barrier = true, security_invoker = false)
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
    when l.category in ('Website', 'E-commerce')
      and d.key = 'monthly_traffic'
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_visitors,
  max(case
    when d.key = 'monthly_revenue'
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as monthly_revenue,
  max(case
    when l.category in ('Facebook Page', 'Instagram Account', 'TikTok Account', 'X Account')
      and d.key = 'followers'
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as total_followers,
  max(case
    when l.category = 'YouTube Channel'
      and d.key in ('subscribers', 'followers')
      and d.value ~ '^[0-9]+([.][0-9]+)?$'
    then d.value::numeric
  end) as total_subscribers,
  max(d.value) filter (where d.key = 'asset_type') as subcategory
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
