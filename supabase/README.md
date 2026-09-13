# Supabase setup

Apply `migrations/001_rls_policies.sql` in the Supabase SQL Editor using an administrative database role. The migration enables RLS on `profiles`, `events`, and `registrations`, adds non-recursive security-definer role helpers in a private schema, and restricts browser grants.

Verify in the Supabase dashboard:

- Email confirmation behavior and redirect URLs
- Authentication URL Configuration
- The existing `auth.users` profile trigger
- The unique partial index for active registrations
- RLS policy behavior with anonymous, attendee, second-attendee, and admin test users

Local redirect URLs:

- `http://127.0.0.1:5173/login`
- `http://127.0.0.1:5173/reset-password`

Use exact production HTTPS URLs after deployment. Do not store service-role keys in frontend variables.
