-- Nexa persistent buyer-seller messaging
-- Run the complete file in the Nexa Supabase SQL Editor.

create table if not exists public.nexa_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.asset_listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  listing_title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  constraint nexa_conversations_distinct_participants check (buyer_id <> seller_id)
);

create index if not exists nexa_conversations_buyer_updated_idx
  on public.nexa_conversations (buyer_id, updated_at desc);
create index if not exists nexa_conversations_seller_updated_idx
  on public.nexa_conversations (seller_id, updated_at desc);

create table if not exists public.nexa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.nexa_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists nexa_messages_conversation_created_idx
  on public.nexa_messages (conversation_id, created_at asc);

alter table public.nexa_conversations enable row level security;
alter table public.nexa_messages enable row level security;

drop policy if exists "Nexa participants read conversations" on public.nexa_conversations;
create policy "Nexa participants read conversations"
on public.nexa_conversations for select to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

create or replace function public.nexa_can_start_conversation(p_listing_id uuid,p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1 from public.asset_listings l
    where l.id = p_listing_id
      and l.user_id = p_seller_id
      and l.status = 'approved'
  );
$func$;

grant execute on function public.nexa_can_start_conversation(uuid,uuid) to authenticated;

drop policy if exists "Nexa buyers start conversations for approved listings" on public.nexa_conversations;
create policy "Nexa buyers start conversations for approved listings"
on public.nexa_conversations for insert to authenticated
with check (
  auth.uid() = buyer_id
  and buyer_id <> seller_id
  and public.nexa_can_start_conversation(listing_id,seller_id)
);

drop policy if exists "Nexa participants read messages" on public.nexa_messages;
create policy "Nexa participants read messages"
on public.nexa_messages for select to authenticated
using (
  exists (
    select 1 from public.nexa_conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

drop policy if exists "Nexa participants send messages" on public.nexa_messages;
create policy "Nexa participants send messages"
on public.nexa_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.nexa_conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

grant select, insert on public.nexa_conversations to authenticated;
grant select, insert on public.nexa_messages to authenticated;
