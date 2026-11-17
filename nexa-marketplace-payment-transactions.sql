-- ============================================================
-- NEXA MARKETPLACE PAYMENT TRANSACTIONS
-- Run in the Nexa Supabase SQL Editor (not TaskBridge).
-- A single payment record is visible to both transaction parties.
-- Each party receives only their own user_id and email via RPC.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.marketplace_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique
    default ('NX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),

  buyer_id uuid not null references auth.users(id) on delete restrict,
  buyer_email text not null,
  seller_id uuid not null references auth.users(id) on delete restrict,
  seller_email text not null,

  listing_id uuid not null references public.asset_listings(id) on delete restrict,
  listing_title text not null,

  provider_transaction_id text not null
    check (char_length(btrim(provider_transaction_id)) between 1 and 120),
  payment_method text not null
    check (lower(payment_method) in ('bank transfer', 'payoneer', 'wise', 'paypal', 'bkash', 'nagad', 'rocket')),

  amount numeric(20,2) not null check (amount > 0),
  currency text not null check (currency in ('USD', 'EUR', 'GBP', 'BDT')),

  status text not null default 'processing'
    check (status in ('processing', 'paid', 'not_paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,

  constraint marketplace_payment_parties_differ
    check (buyer_id <> seller_id)
);

create unique index if not exists marketplace_payment_provider_txn_unique
  on public.marketplace_payment_transactions (lower(btrim(provider_transaction_id)));
create index if not exists marketplace_payment_buyer_created_idx
  on public.marketplace_payment_transactions (buyer_id, created_at desc);
create index if not exists marketplace_payment_seller_created_idx
  on public.marketplace_payment_transactions (seller_id, created_at desc);
create index if not exists marketplace_payment_listing_idx
  on public.marketplace_payment_transactions (listing_id, created_at desc);

alter table public.marketplace_payment_transactions enable row level security;

-- No direct table access from browser clients. Access is through the
-- carefully scoped SECURITY DEFINER functions below.
revoke all on public.marketplace_payment_transactions from anon, authenticated;

-- Buyer submits the payment reference. The database derives both parties,
-- emails, listing title, amount and currency from trusted records.
create or replace function public.nexa_submit_marketplace_payment(
  p_listing_id uuid,
  p_payment_method text,
  p_provider_transaction_id text
)
returns table (
  id uuid,
  transaction_number text,
  user_id uuid,
  email text,
  participant_role text,
  provider_transaction_id text,
  payment_method text,
  amount numeric,
  currency text,
  status text,
  listing_title text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_seller_id uuid;
  v_buyer_email text;
  v_seller_email text;
  v_listing_title text;
  v_amount numeric(20,2);
  v_currency text;
  v_method text;
  v_provider_txn text := nullif(btrim(p_provider_transaction_id), '');
begin
  if v_buyer_id is null then
    raise exception 'You must be signed in to submit a payment.';
  end if;

  if p_listing_id is null then
    raise exception 'A valid listing is required.';
  end if;

  if v_provider_txn is null then
    raise exception 'Please enter the payment transaction ID.';
  end if;

  if char_length(v_provider_txn) > 120 then
    raise exception 'The payment transaction ID is too long.';
  end if;

  v_method := case lower(btrim(coalesce(p_payment_method, '')))
    when 'bank transfer' then 'Bank Transfer'
    when 'bank_transfer' then 'Bank Transfer'
    when 'payoneer' then 'Payoneer'
    when 'wise' then 'Wise'
    when 'paypal' then 'PayPal'
    when 'bkash' then 'bKash'
    when 'nagad' then 'Nagad'
    when 'rocket' then 'Rocket'
    else null
  end;

  if v_method is null then
    raise exception 'The selected payment method is not supported.';
  end if;

  select l.user_id, l.title, l.asking_price, l.price_currency
    into v_seller_id, v_listing_title, v_amount, v_currency
    from public.asset_listings as l
   where l.id = p_listing_id
     and l.status = 'approved';

  if not found then
    raise exception 'This listing is not available for payment.';
  end if;

  if v_seller_id = v_buyer_id then
    raise exception 'You cannot purchase your own listing.';
  end if;

  select u.email into v_buyer_email
    from auth.users as u
   where u.id = v_buyer_id;

  select u.email into v_seller_email
    from auth.users as u
   where u.id = v_seller_id;

  if nullif(v_buyer_email, '') is null or nullif(v_seller_email, '') is null then
    raise exception 'Buyer or seller email is unavailable. Please contact support.';
  end if;

  return query
  insert into public.marketplace_payment_transactions as tx (
    buyer_id, buyer_email, seller_id, seller_email,
    listing_id, listing_title, provider_transaction_id,
    payment_method, amount, currency
  )
  values (
    v_buyer_id, v_buyer_email, v_seller_id, v_seller_email,
    p_listing_id, v_listing_title, v_provider_txn,
    v_method, v_amount, v_currency
  )
  returning
    tx.id,
    tx.transaction_number,
    tx.buyer_id,
    tx.buyer_email,
    'Buyer'::text,
    tx.provider_transaction_id,
    tx.payment_method,
    tx.amount,
    tx.currency,
    tx.status,
    tx.listing_title,
    tx.created_at;
end;
$$;

-- Buyer and seller can both load the same transaction, but the function
-- returns only the signed-in participant's own ID and email.
create or replace function public.nexa_get_my_marketplace_transactions()
returns table (
  id uuid,
  transaction_number text,
  user_id uuid,
  email text,
  participant_role text,
  provider_transaction_id text,
  payment_method text,
  amount numeric,
  currency text,
  status text,
  listing_title text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.transaction_number,
    case when auth.uid() = t.buyer_id then t.buyer_id else t.seller_id end,
    case when auth.uid() = t.buyer_id then t.buyer_email else t.seller_email end,
    case when auth.uid() = t.buyer_id then 'Buyer'::text else 'Seller'::text end,
    t.provider_transaction_id,
    t.payment_method,
    t.amount,
    t.currency,
    t.status,
    t.listing_title,
    t.created_at
  from public.marketplace_payment_transactions as t
  where auth.uid() = t.buyer_id
     or auth.uid() = t.seller_id
  order by t.created_at desc;
$$;

-- Only an authenticated Nexa administrator can mark a payment Paid or Not Paid.
create or replace function public.nexa_admin_set_marketplace_payment_status(
  p_transaction_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Administrator access is required.';
  end if;

  if p_status not in ('processing', 'paid', 'not_paid') then
    raise exception 'Invalid payment status.';
  end if;

  update public.marketplace_payment_transactions
     set status = p_status,
         paid_at = case when p_status = 'paid' then now() else null end,
         updated_at = now()
   where id = p_transaction_id;

  if not found then
    raise exception 'Payment transaction not found.';
  end if;
end;
$$;

-- Keep the stored email snapshots in sync if an account email changes.
create or replace function public.nexa_sync_marketplace_payment_emails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.marketplace_payment_transactions
       set buyer_email = new.email,
           updated_at = now()
     where buyer_id = new.id;

    update public.marketplace_payment_transactions
       set seller_email = new.email,
           updated_at = now()
     where seller_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.nexa_submit_marketplace_payment(uuid, text, text)
  from public, anon;
revoke all on function public.nexa_get_my_marketplace_transactions()
  from public, anon;
revoke all on function public.nexa_admin_set_marketplace_payment_status(uuid, text)
  from public, anon;
revoke all on function public.nexa_sync_marketplace_payment_emails()
  from public, anon, authenticated;

grant execute on function public.nexa_submit_marketplace_payment(uuid, text, text)
  to authenticated;
grant execute on function public.nexa_get_my_marketplace_transactions()
  to authenticated;
grant execute on function public.nexa_admin_set_marketplace_payment_status(uuid, text)
  to authenticated;

drop trigger if exists nexa_sync_marketplace_payment_emails on auth.users;
create trigger nexa_sync_marketplace_payment_emails
  after update of email on auth.users
  for each row
  execute function public.nexa_sync_marketplace_payment_emails();

-- Optional Realtime publication entry; page refresh and section navigation
-- also reload the list, so transactions remain usable without Realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'marketplace_payment_transactions'
     ) then
    alter publication supabase_realtime
      add table public.marketplace_payment_transactions;
  end if;
end;
$$;

-- Status flow:
-- processing = buyer submitted a payment reference, awaiting Nexa verification
-- paid       = Nexa admin verified the payment
-- not_paid   = Nexa admin could not verify / payment was not received
