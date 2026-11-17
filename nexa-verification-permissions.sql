-- Nexa verification table permissions
-- Run in the Nexa Supabase SQL Editor only. RLS policies continue to restrict each user's rows.
grant select, insert, update on table public.user_verification_submissions to authenticated;
