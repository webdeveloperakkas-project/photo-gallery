-- Nexa admin-only listing edit and delete actions
-- Run this in the Nexa Supabase SQL Editor only.
-- These SECURITY DEFINER functions validate the caller's admin role and
-- avoid granting broad table UPDATE/DELETE permissions to every user.

create or replace function public.admin_update_asset_listing(
  p_listing_id uuid,
  p_title text,
  p_category text,
  p_asking_price numeric,
  p_price_currency text,
  p_summary text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_title), '') is null
     or nullif(trim(p_category), '') is null
     or p_asking_price is null
     or p_asking_price < 0
     or nullif(trim(p_price_currency), '') is null then
    raise exception 'Please provide a valid title, category, asking price and currency';
  end if;

  update public.asset_listings
  set title = trim(p_title),
      category = trim(p_category),
      asking_price = p_asking_price,
      price_currency = upper(trim(p_price_currency)),
      summary = coalesce(p_summary, ''),
      admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where id = p_listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;
end;
$$;

create or replace function public.admin_delete_asset_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;

  delete from public.asset_listings where id = p_listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;
end;
$$;

revoke all on function public.admin_update_asset_listing(uuid, text, text, numeric, text, text, text) from public;
revoke all on function public.admin_delete_asset_listing(uuid) from public;
grant execute on function public.admin_update_asset_listing(uuid, text, text, numeric, text, text, text) to authenticated;
grant execute on function public.admin_delete_asset_listing(uuid) to authenticated;
