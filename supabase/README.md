# Supabase setup

Apply these migrations in order with an administrative database role (or use the Supabase MCP / SQL Editor):

1. `migrations/001_rls_policies.sql` — enables RLS, private role helpers, and table grants
2. `migrations/002_auth_profile_hardening.sql` — moves `handle_new_user` into `private`, syncs profile email on Auth email changes, and revokes public execute

Verify in the Supabase dashboard:

- Email confirmation behavior and redirect URLs
- Authentication URL Configuration
- The `auth.users` → `private.handle_new_user` profile trigger
- The unique partial index for active registrations
- RLS policy behavior with anonymous, attendee, second-attendee, and admin test users

Local redirect URLs to allowlist:

- `http://127.0.0.1:5173/auth/callback`
- `http://127.0.0.1:5173/login`
- `http://127.0.0.1:5173/reset-password`

Production: set Site URL and Redirect URLs to the exact deployed HTTPS frontend, including `/auth/callback` and `/reset-password`. Set backend `PUBLIC_APP_URL`, `AUTH_CONFIRMATION_REDIRECT_URL`, `PASSWORD_RESET_REDIRECT_URL`, and `EMAIL_CHANGE_REDIRECT_URL` to those same HTTPS URLs. Do not store service-role keys in frontend variables.
