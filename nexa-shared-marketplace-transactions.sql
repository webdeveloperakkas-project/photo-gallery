-- Nexa shared buyer/seller wallet transaction workflow (no new transaction table).
-- Run after nexa-wallet-and-transactions.sql in Supabase SQL Editor.

alter table public.wallet_transactions
  add column if not exists buyer_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists buyer_email text,
  add column if not exists transaction_number text,
  add column if not exists payment_method text,
  add column if not exists buyer_payment_status text not null default 'processing';

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_buyer_payment_status_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_buyer_payment_status_check
  check (buyer_payment_status in ('processing','paid','not_paid'));

create unique index if not exists wallet_transactions_transaction_number_uidx
  on public.wallet_transactions(transaction_number)
  where transaction_number is not null;
create index if not exists wallet_transactions_buyer_user_created_idx
  on public.wallet_transactions(buyer_user_id, created_at desc);

-- Replace the foundation's listing-wide unique key: each buyer may order the same listing.
drop index if exists public.wallet_transactions_reference_unique_idx;
create unique index wallet_transactions_reference_unique_idx
  on public.wallet_transactions(wallet_account_id, reference_type, reference_id, transaction_type, buyer_user_id)
  where reference_id is not null;

drop policy if exists "Users can view their own wallet transactions" on public.wallet_transactions;
create policy "Transaction participants can view shared wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (auth.uid() = user_id or auth.uid() = buyer_user_id or public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.nexa_submit_marketplace_payment(
  p_listing_id uuid,
  p_payment_method text,
  p_transaction_number text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer uuid := auth.uid();
  v_buyer_email text;
  v_seller uuid;
  v_seller_email text;
  v_amount numeric(20,2);
  v_currency text;
  v_method text;
  v_wallet_id uuid;
  v_tx uuid;
begin
  if v_buyer is null then raise exception 'Please sign in before submitting payment'; end if;
  if nullif(trim(p_transaction_number),'') is null then raise exception 'Transaction ID is required'; end if;
  v_method := lower(replace(trim(p_payment_method),' ','_'));
  if v_method not in ('bank_transfer','payoneer','wise','paypal','bkash','nagad','rocket') then
    raise exception 'Unsupported payment method';
  end if;

  select l.user_id, u.email, l.asking_price, upper(l.price_currency)
    into v_seller, v_seller_email, v_amount, v_currency
    from public.asset_listings l
    join auth.users u on u.id=l.user_id
   where l.id=p_listing_id and l.status='approved';
  if v_seller is null then raise exception 'Listing is unavailable'; end if;
  if v_seller=v_buyer then raise exception 'You cannot buy your own listing'; end if;

  select email into v_buyer_email from auth.users where id=v_buyer;
  select id into v_wallet_id
    from public.wallet_accounts
   where user_id=v_seller and payment_method=v_method and currency=v_currency
   limit 1;
  if v_wallet_id is null then
    raise exception 'Seller wallet for this payment method and currency is not configured';
  end if;

  if exists(select 1 from public.wallet_transactions
            where reference_type='order' and reference_id=p_listing_id::text
              and buyer_user_id=v_buyer) then
    raise exception 'A payment record already exists for this buyer and listing';
  end if;

  insert into public.wallet_transactions(
    user_id,email,wallet_account_id,reference_type,reference_id,
    transaction_type,status,amount,currency,description,metadata,
    buyer_user_id,buyer_email,transaction_number,payment_method,buyer_payment_status
  ) values (
    v_seller,v_seller_email,v_wallet_id,'order',p_listing_id::text,
    'sale_pending','pending',v_amount,v_currency,
    'Marketplace sale payment submitted by buyer',
    jsonb_build_object('listing_id',p_listing_id),
    v_buyer,v_buyer_email,trim(p_transaction_number),v_method,'processing'
  ) returning id into v_tx;

  return v_tx;
end;
$$;

create or replace function public.admin_set_marketplace_payment_status(
  p_transaction_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.wallet_transactions%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('paid','not_paid') then raise exception 'Invalid payment status'; end if;

  select * into v_tx from public.wallet_transactions
   where id=p_transaction_id and reference_type='order'
   for update;
  if not found then raise exception 'Marketplace payment not found'; end if;

  if p_status='paid' and v_tx.buyer_payment_status <> 'paid' then
    update public.wallet_accounts
       set pending_balance=pending_balance+v_tx.amount,
           total_earned=total_earned+v_tx.amount,
           updated_at=now()
     where id=v_tx.wallet_account_id;
    if not found then raise exception 'Seller wallet account not found'; end if;
  elsif p_status='not_paid' and v_tx.buyer_payment_status='paid' then
    update public.wallet_accounts
       set pending_balance=greatest(0,pending_balance-v_tx.amount),
           total_earned=greatest(0,total_earned-v_tx.amount),
           updated_at=now()
     where id=v_tx.wallet_account_id;
  end if;

  update public.wallet_transactions
     set buyer_payment_status=p_status,
         completed_at=case when p_status='paid' then now() else null end
   where id=p_transaction_id;
end;
$$;

revoke all on function public.nexa_submit_marketplace_payment(uuid,text,text) from public, anon;
grant execute on function public.nexa_submit_marketplace_payment(uuid,text,text) to authenticated;
revoke all on function public.admin_set_marketplace_payment_status(uuid,text) from public, anon;
grant execute on function public.admin_set_marketplace_payment_status(uuid,text) to authenticated;

-- Keep both participants' email snapshots in sync with Auth email changes.
create or replace function public.nexa_sync_wallet_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.wallet_accounts set email=new.email, updated_at=now() where user_id=new.id;
    update public.wallet_transactions set email=new.email where user_id=new.id;
    update public.wallet_transactions set buyer_email=new.email where buyer_user_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.nexa_sync_wallet_user_email() from public, anon, authenticated;
