-- Nexa 12% seller-paid marketplace fee.
-- Run once in the Nexa Supabase SQL Editor before deploying the matching frontend changes.
-- Buyer payment remains exactly asset_listings.asking_price. The 12% is deducted from seller proceeds.
alter table public.wallet_transactions
  add column if not exists seller_net_amount numeric(20,2) not null default 0,
  add column if not exists platform_fee_amount numeric(20,2) not null default 0,
  add column if not exists administration_fee_amount numeric(20,2) not null default 0,
  add column if not exists marketplace_service_fee_amount numeric(20,2) not null default 0,
  add column if not exists payment_wallet_operations_fee_amount numeric(20,2) not null default 0;

update public.wallet_transactions
set platform_fee_amount=round(amount*0.12,2),
    administration_fee_amount=round(amount*0.02,2),
    marketplace_service_fee_amount=round(amount*0.05,2),
    payment_wallet_operations_fee_amount=round(amount*0.12,2)-round(amount*0.02,2)-round(amount*0.05,2),
    seller_net_amount=amount-round(amount*0.12,2)
where reference_type='order' and seller_net_amount=0;

create or replace function public.nexa_submit_marketplace_payment(
  p_listing_id uuid,p_payment_method text,p_transaction_number text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_buyer uuid:=auth.uid(); v_buyer_email text; v_seller uuid; v_seller_email text;
  v_amount numeric(20,2); v_fee numeric(20,2); v_admin_fee numeric(20,2);
  v_service_fee numeric(20,2); v_wallet_fee numeric(20,2); v_seller_net numeric(20,2);
  v_currency text; v_method text; v_wallet_id uuid; v_tx uuid;
begin
  if v_buyer is null then raise exception 'Please sign in before submitting payment'; end if;
  if nullif(trim(p_transaction_number),'') is null then raise exception 'Transaction ID is required'; end if;
  v_method:=lower(replace(trim(p_payment_method),' ','_'));
  if v_method not in ('bank_transfer','payoneer','wise','paypal','bkash','nagad','rocket') then raise exception 'Unsupported payment method'; end if;
  select l.user_id,u.email,l.asking_price,upper(l.price_currency)
    into v_seller,v_seller_email,v_amount,v_currency
    from public.asset_listings l join auth.users u on u.id=l.user_id
   where l.id=p_listing_id and l.status='approved';
  if v_seller is null then raise exception 'Listing is unavailable'; end if;
  if v_seller=v_buyer then raise exception 'You cannot buy your own listing'; end if;
  if v_amount is null or v_amount<=0 then raise exception 'Invalid listing asking price'; end if;
  select email into v_buyer_email from auth.users where id=v_buyer;
  select id into v_wallet_id from public.wallet_accounts
   where user_id=v_seller and payment_method=v_method and currency=v_currency limit 1;
  if v_wallet_id is null then raise exception 'Seller wallet for this payment method and currency is not configured'; end if;
  if exists(select 1 from public.wallet_transactions where reference_type='order'
            and reference_id=p_listing_id::text and buyer_user_id=v_buyer) then
    raise exception 'A payment record already exists for this buyer and listing';
  end if;
  v_fee:=round(v_amount*0.12,2);
  v_admin_fee:=round(v_amount*0.02,2);
  v_service_fee:=round(v_amount*0.05,2);
  v_wallet_fee:=v_fee-v_admin_fee-v_service_fee;
  v_seller_net:=v_amount-v_fee;
  insert into public.wallet_transactions(
    user_id,email,wallet_account_id,reference_type,reference_id,transaction_type,status,
    amount,currency,description,metadata,buyer_user_id,buyer_email,transaction_number,
    payment_method,buyer_payment_status,seller_net_amount,platform_fee_amount,
    administration_fee_amount,marketplace_service_fee_amount,payment_wallet_operations_fee_amount
  ) values (
    v_seller,v_seller_email,v_wallet_id,'order',p_listing_id::text,'sale_pending','pending',
    v_amount,v_currency,'Buyer pays exact asking price; Nexa fee deducted from seller proceeds',
    jsonb_build_object('listing_id',p_listing_id,'buyer_payment_amount',v_amount,
      'seller_fee_rate',0.12,'administration_fee_rate',0.02,
      'marketplace_service_fee_rate',0.05,'payment_wallet_operations_fee_rate',0.05,
      'fee_payer','seller'),
    v_buyer,v_buyer_email,trim(p_transaction_number),v_method,'processing',
    v_seller_net,v_fee,v_admin_fee,v_service_fee,v_wallet_fee
  ) returning id into v_tx;
  return v_tx;
end;
$$;

create or replace function public.admin_set_marketplace_payment_status(p_transaction_id uuid,p_status text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_tx public.wallet_transactions%rowtype; v_seller_credit numeric(20,2);
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin'::public.app_role) then raise exception 'Admin access required'; end if;
  if p_status not in ('paid','not_paid') then raise exception 'Invalid payment status'; end if;
  select * into v_tx from public.wallet_transactions where id=p_transaction_id and reference_type='order' for update;
  if not found then raise exception 'Marketplace payment not found'; end if;
  v_seller_credit:=case when v_tx.seller_net_amount>0 then v_tx.seller_net_amount else v_tx.amount-round(v_tx.amount*0.12,2) end;
  if p_status='paid' and v_tx.buyer_payment_status<>'paid' then
    update public.wallet_accounts set pending_balance=pending_balance+v_seller_credit,
      total_earned=total_earned+v_seller_credit,updated_at=now() where id=v_tx.wallet_account_id;
    if not found then raise exception 'Seller wallet account not found'; end if;
  elsif p_status='not_paid' and v_tx.buyer_payment_status='paid' then
    update public.wallet_accounts set pending_balance=greatest(0,pending_balance-v_seller_credit),
      total_earned=greatest(0,total_earned-v_seller_credit),updated_at=now() where id=v_tx.wallet_account_id;
  end if;
  update public.wallet_transactions set buyer_payment_status=p_status,
    completed_at=case when p_status='paid' then now() else null end where id=p_transaction_id;
end;
$$;
revoke all on function public.nexa_submit_marketplace_payment(uuid,text,text) from public,anon;
grant execute on function public.nexa_submit_marketplace_payment(uuid,text,text) to authenticated;
revoke all on function public.admin_set_marketplace_payment_status(uuid,text) from public,anon;
grant execute on function public.admin_set_marketplace_payment_status(uuid,text) to authenticated;
