-- Permissive admin write policies are required alongside restrictive ones.
-- Without at least one permissive INSERT/UPDATE/DELETE policy, Postgres denies access.

DROP POLICY IF EXISTS "events_admin_insert" ON public.events;
CREATE POLICY events_admin_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "events_admin_update" ON public.events;
CREATE POLICY events_admin_update ON public.events
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "events_admin_delete" ON public.events;
CREATE POLICY events_admin_delete ON public.events
  FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

-- Authenticated clients need table privileges; RLS still gates admin writes.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
