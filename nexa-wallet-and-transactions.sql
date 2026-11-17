-- =====================================================
-- NEXA: MY WALLET + TRANSACTIONS DATABASE FOUNDATION
-- Run this in the Nexa Supabase SQL Editor.
-- User identity columns are intentionally listed first:
-- user_id, email.
-- =====================================================

create extension if not exists pgcrypto;

-- 1. WALLET ACCOUNTS
create table if not exists public.wallet_accounts (
    user_id uuid not null references auth.users(id) on delete cascade,
    email text not null,
    id uuid primary key default gen_random_uuid(),

    payment_method text not null
        check (payment_method in (
            'bank_transfer', 'payoneer', 'wise', 'paypal',
            'bkash', 'nagad', 'rocket'
        )),

    currency text not null
        check (currency in ('USD', 'EUR', 'GBP', 'BDT')),

    available_balance numeric(20,2) not null default 0
        check (available_balance >= 0),
    pending_balance numeric(20,2) not null default 0
        check (pending_balance >= 0),
    total_earned numeric(20,2) not null default 0
        check (total_earned >= 0),
    total_withdrawn numeric(20,2) not null default 0
        check (total_withdrawn >= 0),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint wallet_accounts_user_method_currency_key
        unique (user_id, payment_method, currency)
);

-- 2. WALLET TRANSACTIONS
create table if not exists public.wallet_transactions (
    user_id uuid not null references auth.users(id) on delete restrict,
    email text not null,
    id uuid primary key default gen_random_uuid(),

    wallet_account_id uuid not null
        references public.wallet_accounts(id) on delete restrict,

    reference_type text not null
        check (reference_type in (
            'order', 'withdrawal', 'adjustment', 'refund'
        )),
    reference_id text,

    transaction_type text not null
        check (transaction_type in (
            'sale_pending',
            'sale_release',
            'withdrawal_hold',
            'withdrawal_paid',
            'withdrawal_reversal',
            'platform_fee',
            'refund',
            'admin_adjustment'
        )),

    status text not null default 'pending'
        check (status in ('pending', 'completed', 'held', 'reversed')),

    amount numeric(20,2) not null check (amount > 0),
    currency text not null
        check (currency in ('USD', 'EUR', 'GBP', 'BDT')),

    description text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

-- 3. INDEXES
create index if not exists wallet_accounts_user_idx
    on public.wallet_accounts(user_id);
create index if not exists wallet_accounts_email_idx
    on public.wallet_accounts(email);
create index if not exists wallet_transactions_user_created_idx
    on public.wallet_transactions(user_id, created_at desc);
create index if not exists wallet_transactions_account_created_idx
    on public.wallet_transactions(wallet_account_id, created_at desc);
create index if not exists wallet_transactions_status_idx
    on public.wallet_transactions(user_id, status);

create unique index if not exists wallet_transactions_reference_unique_idx
    on public.wallet_transactions(
        wallet_account_id, reference_type, reference_id, transaction_type
    )
    where reference_id is not null;

-- 4. ROW LEVEL SECURITY
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can view their own wallet accounts"
    on public.wallet_accounts;
create policy "Users can view their own wallet accounts"
    on public.wallet_accounts
    for select to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Users can view their own wallet transactions"
    on public.wallet_transactions;
create policy "Users can view their own wallet transactions"
    on public.wallet_transactions
    for select to authenticated
    using (auth.uid() = user_id);

-- Clients can read their own rows, but cannot directly change balances
-- or insert transactions. Future trusted server-side functions will do that.
revoke all on public.wallet_accounts from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;
grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_transactions to authenticated;

-- 5. SEED WALLET ACCOUNTS FOR ONE USER
create or replace function public.nexa_seed_wallet_accounts(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_email text;
begin
    select u.email
      into v_email
      from auth.users as u
     where u.id = p_user_id;

    if v_email is null then
        raise exception 'User email not found for wallet initialization';
    end if;

    insert into public.wallet_accounts (
        user_id, email, payment_method, currency
    )
    values
        (p_user_id, v_email, 'bkash', 'BDT'),
        (p_user_id, v_email, 'nagad', 'BDT'),
        (p_user_id, v_email, 'rocket', 'BDT'),
        (p_user_id, v_email, 'bank_transfer', 'BDT'),
        (p_user_id, v_email, 'wise', 'USD'),
        (p_user_id, v_email, 'wise', 'EUR'),
        (p_user_id, v_email, 'wise', 'GBP'),
        (p_user_id, v_email, 'payoneer', 'USD'),
        (p_user_id, v_email, 'payoneer', 'EUR'),
        (p_user_id, v_email, 'payoneer', 'GBP'),
        (p_user_id, v_email, 'paypal', 'USD'),
        (p_user_id, v_email, 'paypal', 'EUR'),
        (p_user_id, v_email, 'paypal', 'GBP'),
        (p_user_id, v_email, 'bank_transfer', 'USD'),
        (p_user_id, v_email, 'bank_transfer', 'EUR'),
        (p_user_id, v_email, 'bank_transfer', 'GBP')
    on conflict (user_id, payment_method, currency)
    do update set email = excluded.email;
end;
$$;

revoke all on function public.nexa_seed_wallet_accounts(uuid)
    from public, anon, authenticated;

-- 6. AUTOMATIC WALLET INITIALIZATION FOR NEW AUTH USERS
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

revoke all on function public.nexa_on_auth_user_created_seed_wallets()
    from public, anon, authenticated;

drop trigger if exists nexa_seed_wallets_after_signup on auth.users;
create trigger nexa_seed_wallets_after_signup
    after insert on auth.users
    for each row
    execute function public.nexa_on_auth_user_created_seed_wallets();

-- 7. KEEP WALLET EMAIL COPIES IN SYNC WITH AUTH EMAIL
create or replace function public.nexa_sync_wallet_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.email is distinct from old.email then
        update public.wallet_accounts
           set email = new.email,
               updated_at = now()
         where user_id = new.id;

        update public.wallet_transactions
           set email = new.email
         where user_id = new.id;
    end if;

    return new;
end;
$$;

revoke all on function public.nexa_sync_wallet_user_email()
    from public, anon, authenticated;

drop trigger if exists nexa_sync_wallet_email on auth.users;
create trigger nexa_sync_wallet_email
    after update of email on auth.users
    for each row
    execute function public.nexa_sync_wallet_user_email();

-- 8. INITIALIZE WALLETS FOR USERS WHO ALREADY EXIST
insert into public.wallet_accounts (
    user_id, email, payment_method, currency
)
select
    u.id,
    u.email,
    v.payment_method,
    v.currency
from auth.users as u
cross join (
    values
        ('bkash', 'BDT'),
        ('nagad', 'BDT'),
        ('rocket', 'BDT'),
        ('bank_transfer', 'BDT'),
        ('wise', 'USD'),
        ('wise', 'EUR'),
        ('wise', 'GBP'),
        ('payoneer', 'USD'),
        ('payoneer', 'EUR'),
        ('payoneer', 'GBP'),
        ('paypal', 'USD'),
        ('paypal', 'EUR'),
        ('paypal', 'GBP'),
        ('bank_transfer', 'USD'),
        ('bank_transfer', 'EUR'),
        ('bank_transfer', 'GBP')
) as v(payment_method, currency)
where u.email is not null
on conflict (user_id, payment_method, currency)
do update set email = excluded.email;

-- 9. ENABLE REALTIME FOR BOTH TABLES (IF PUBLICATION EXISTS)
do $$
begin
    if exists (
        select 1 from pg_publication
        where pubname = 'supabase_realtime'
    ) then
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'wallet_accounts'
        ) then
            alter publication supabase_realtime
                add table public.wallet_accounts;
        end if;

        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'wallet_transactions'
        ) then
            alter publication supabase_realtime
                add table public.wallet_transactions;
        end if;
    end if;
end;
$$;

-- END OF NEXA WALLET + TRANSACTIONS FOUNDATION
