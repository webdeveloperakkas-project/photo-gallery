-- Nexa: allow each signed-in user to update only their own editable profile fields.
-- Run in the Nexa Supabase SQL Editor, not TaskBridge.

alter table public.user_profiles enable row level security;

grant select on public.user_profiles to authenticated;

grant update (
  first_name,
  last_name,
  display_name,
  phone,
  country,
  date_of_birth,
  gender,
  updated_at
) on public.user_profiles to authenticated;

drop policy if exists "Nexa users update own profile" on public.user_profiles;
create policy "Nexa users update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
