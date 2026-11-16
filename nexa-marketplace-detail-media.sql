-- Nexa marketplace public asset detail + image storage
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
  ),'[]'::jsonb) as public_details
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
  l.submitted_at,l.user_id,u.raw_user_meta_data,u.created_at,l.listing_data;

grant select on public.marketplace_public_listings to anon,authenticated;
