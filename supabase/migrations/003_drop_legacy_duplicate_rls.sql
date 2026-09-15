-- Remove legacy permissive policies that duplicate (or weaken) the hardened set.
-- Especially drop profile update policies without role immutability checks.
-- Do NOT drop events_admin_insert/update/delete — those permissive policies are
-- required alongside the restrictive events_*_admin_only policies.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can cancel own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Users can create own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Users can view own registrations" ON public.registrations;

DROP POLICY IF EXISTS "Authenticated users can view published events" ON public.events;
