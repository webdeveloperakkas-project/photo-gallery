-- Nexa wallet foundation: separate balances by user, payout method and currency.
-- This is an earnings wallet, not a deposit wallet. Sale proceeds enter Pending first.
create extension if not exists pgcrypto;

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_method text not null check (payment_method in ('bank_transfer','payoneer','wise','paypal','bkash','nagad','rocket')),
  currency text not null check (currency in ('USD','EUR','GBP','BDT')),
  available_balance numeric(20,2) not null default 0 check (available_balance >= 0),
  pending_balance numeric(20,2) not null default 0 check (pending_balance >= 0),
  total_earned numeric(20,2) not null default 0 check (total_earned >= 0),
  total_withdrawn numeric(20,2) not null default 0 check (total_withdrawn >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, payment_method, currency)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  reference_type text not null check (reference_type in ('order','withdrawal','adjustment','refund')),
  reference_id text,
  transaction_type text not null check (transaction_type in ('sale_pending','sale_release','withdrawal_hold','withdrawal_paid','withdrawal_reversal','platform_fee','refund','admin_adjustment')),
  status text not null default 'pending' check (status in ('pending','completed','held','reversed')),
  amount numeric(20,2) not null check (amount > 0),
  currency text not null check (currency in ('USD','EUR','GBP','BDT')),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists wallet_accounts_user_idx on public.wallet_accounts(user_id);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);
create index if not exists wallet_transactions_account_created_idx on public.wallet_transactions(wallet_account_id, created_at desc);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can view their own wallet accounts" on public.wallet_accounts;
create policy "Users can view their own wallet accounts"
  on public.wallet_accounts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own wallet transactions" on public.wallet_transactions;
create policy "Users can view their own wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.wallet_accounts from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;
grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_transactions to authenticated;

create or replace function public.nexa_seed_wallet_accounts(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.wallet_accounts (user_id, payment_method, currency)
  values
    (p_user_id, 'bkash', 'BDT'),
    (p_user_id, 'nagad', 'BDT'),
    (p_user_id, 'rocket', 'BDT'),
    (p_user_id, 'bank_transfer', 'BDT'),
    (p_user_id, 'wise', 'USD'), (p_user_id, 'wise', 'EUR'), (p_user_id, 'wise', 'GBP'),
    (p_user_id, 'payoneer', 'USD'), (p_user_id, 'payoneer', 'EUR'), (p_user_id, 'payoneer', 'GBP'),
    (p_user_id, 'paypal', 'USD'), (p_user_id, 'paypal', 'EUR'), (p_user_id, 'paypal', 'GBP'),
    (p_user_id, 'bank_transfer', 'USD'), (p_user_id, 'bank_transfer', 'EUR'), (p_user_id, 'bank_transfer', 'GBP')
  on conflict (user_id, payment_method, currency) do nothing;
$$;

revoke all on function public.nexa_seed_wallet_accounts(uuid) from public, anon, authenticated;

create or replace function public.nexa_on_auth_user_created_seed_wallets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.nexa_seed_wallet_accounts(new.id);
  return new;
end;
$$;

drop trigger if exists nexa_seed_wallets_after_signup on auth.users;
create trigger nexa_seed_wallets_after_signup
after insert on auth.users
for each row execute function public.nexa_on_auth_user_created_seed_wallets();

-- Create zero-balance wallet cards for users who already have Nexa accounts.
insert into public.wallet_accounts (user_id, payment_method, currency)
select u.id, v.payment_method, v.currency
from auth.users u
cross join (values
  ('bkash','BDT'),('nagad','BDT'),('rocket','BDT'),('bank_transfer','BDT'),
  ('wise','USD'),('wise','EUR'),('wise','GBP'),
  ('payoneer','USD'),('payoneer','EUR'),('payoneer','GBP'),
  ('paypal','USD'),('paypal','EUR'),('paypal','GBP'),
  ('bank_transfer','USD'),('bank_transfer','EUR'),('bank_transfer','GBP')
) as v(payment_method,currency)
on conflict (user_id, payment_method, currency) do nothing;

-- Keep the wallet header and My Wallet page in sync with server-side balance changes.
do $
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'wallet_accounts'
     ) then
    alter publication supabase_realtime add table public.wallet_accounts;
  end if;
end
$;

-- Keep balance writes server-controlled. The authenticated client can only read its own wallet.
-- Sale/payment/release and withdrawal posting will be connected to the Nexa order workflow in the next stage.
