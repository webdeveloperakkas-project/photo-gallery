-- Nexa profile and verification schema
-- Run this SQL in the Nexa Supabase SQL Editor. Do not run it in TaskBridge.
alter table public.user_profiles
  add column if not exists date_of_birth date,
  add column if not exists gender text;

create table if not exists public.user_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_type text not null check (verification_type in ('identity','address')),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  document_type text,
  country text,
  front_path text,
  back_path text,
  selfie_path text,
  address_document_type text,
  address_document_path text,
  address_line text,
  city text,
  region text,
  postal_code text,
  address_country text,
  admin_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, verification_type)
);

alter table public.user_verification_submissions enable row level security;
drop policy if exists "Users can read own verification submissions" on public.user_verification_submissions;
create policy "Users can read own verification submissions" on public.user_verification_submissions
for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own verification submissions" on public.user_verification_submissions;
create policy "Users can create own verification submissions" on public.user_verification_submissions
for insert to authenticated with check (auth.uid() = user_id and status = 'pending_review');
drop policy if exists "Users can update own rejected submissions" on public.user_verification_submissions;
create policy "Users can update own rejected submissions" on public.user_verification_submissions
for update to authenticated using (auth.uid() = user_id and status = 'rejected')
with check (auth.uid() = user_id and status = 'pending_review');
drop policy if exists "Admins can review verification submissions" on public.user_verification_submissions;
create policy "Admins can review verification submissions" on public.user_verification_submissions
for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('nexa-private-verification','nexa-private-verification',false,2097152,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users upload own Nexa verification files" on storage.objects;
create policy "Users upload own Nexa verification files" on storage.objects
for insert to authenticated with check (bucket_id='nexa-private-verification' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users read own Nexa verification files" on storage.objects;
create policy "Users read own Nexa verification files" on storage.objects
for select to authenticated using (bucket_id='nexa-private-verification' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_role(auth.uid(),'admin'::public.app_role)));
drop policy if exists "Admins manage Nexa verification files" on storage.objects;
create policy "Admins manage Nexa verification files" on storage.objects
for all to authenticated using (bucket_id='nexa-private-verification' and public.has_role(auth.uid(),'admin'::public.app_role))
with check (bucket_id='nexa-private-verification' and public.has_role(auth.uid(),'admin'::public.app_role));
