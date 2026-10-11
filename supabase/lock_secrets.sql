-- =====================================================================
-- LOCK SECRETS  (run ONLY after the new app version with ai-proxy + username-login is live)
-- Old app versions read the Kie/Suno keys straight from system_settings and look up emails with
-- get_user_email; running this makes those OLD versions fail at AI generation / username login.
-- After running it, ROTATE the Kie and Suno API keys (they have been readable by anyone until now),
-- then paste the new keys in Admin Settings.
-- =====================================================================

-- 1) system_settings: everyone can read only non-secret keys; admins can read everything
drop policy if exists "Anyone can view system settings" on public.system_settings;
drop policy if exists "Public can view non-secret settings" on public.system_settings;
create policy "Public can view non-secret settings" on public.system_settings
  for select using (
    key not in ('kie_api_key', 'suno_api_key')
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2) Emails can no longer be looked up by username from the client
revoke execute on function public.get_user_email(text) from anon, authenticated, public;
