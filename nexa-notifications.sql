-- Nexa user notification center
-- Run this in the Nexa Supabase SQL Editor only (never in TaskBridge).
-- Notifications are private to each recipient. New listing and verification
-- review outcomes create notifications automatically. Order notifications can
-- be connected when Nexa's order table/workflow is introduced.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general' check (type in ('general','listing','verification','order')),
  title text not null,
  message text not null,
  link text not null default 'dashboard.html',
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;
drop policy if exists "Users read own Nexa notifications" on public.user_notifications;
create policy "Users read own Nexa notifications"
  on public.user_notifications for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users mark own Nexa notifications read" on public.user_notifications;
create policy "Users mark own Nexa notifications read"
  on public.user_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.user_notifications to authenticated;
grant update (is_read) on public.user_notifications to authenticated;

create or replace function public.nexa_notify_user(
  p_user_id uuid,p_type text,p_title text,p_message text,
  p_link text default 'dashboard.html',p_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then return; end if;
  insert into public.user_notifications(user_id,type,title,message,link,metadata)
  values(p_user_id,p_type,p_title,p_message,coalesce(nullif(p_link,''),'dashboard.html'),coalesce(p_metadata,'{}'::jsonb));
end;
$$;
revoke all on function public.nexa_notify_user(uuid,text,text,text,text,jsonb) from public, anon, authenticated;

create or replace function public.nexa_notify_listing_status()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    perform public.nexa_notify_user(
      new.user_id,'listing',
      case when new.status='approved' then 'Your listing is approved' else 'Your listing needs an update' end,
      case when new.status='approved'
        then '“' || coalesce(new.title,'Your listing') || '” is now approved and can appear in the marketplace.'
        else '“' || coalesce(new.title,'Your listing') || '” was reviewed. ' || coalesce(nullif(new.admin_note,''),'Please review your listing and the admin feedback.')
      end,
      'dashboard.html#my-listings-section',
      jsonb_build_object('listing_id',new.id,'status',new.status)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists nexa_listing_status_notification on public.asset_listings;
create trigger nexa_listing_status_notification
after update of status on public.asset_listings
for each row execute function public.nexa_notify_listing_status();

create or replace function public.nexa_notify_verification_status()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare label text;
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    label := case when new.verification_type='identity' then 'ID verification' else 'Address verification' end;
    perform public.nexa_notify_user(
      new.user_id,'verification',
      case when new.status='approved' then label || ' verified successfully' else label || ' needs more information' end,
      case when new.status='approved'
        then 'Your ' || lower(label) || ' has been reviewed and successfully verified.'
        else 'Your ' || lower(label) || ' needs another update. ' || coalesce(nullif(new.admin_note,''),'Please open your profile and review the instructions.')
      end,
      'profile.html',
      jsonb_build_object('verification_type',new.verification_type,'status',new.status)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists nexa_verification_status_notification on public.user_verification_submissions;
create trigger nexa_verification_status_notification
after update of status on public.user_verification_submissions
for each row execute function public.nexa_notify_verification_status();

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end;
$$;
