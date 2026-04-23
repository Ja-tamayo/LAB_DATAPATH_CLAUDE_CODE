-- Replace restrictive per-user RLS with team-aware policies.
--
-- SELECT / UPDATE: visible if you created it, are assigned, are the owner,
--                  OR your profile role is 'leader' / 'admin_system'.
-- DELETE:  only creator OR admin_system.
-- INSERT:  unchanged (user_id must equal auth.uid()).

-- ── tasks ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tasks: select own"   ON public.tasks;
DROP POLICY IF EXISTS "tasks: update own"   ON public.tasks;
DROP POLICY IF EXISTS "tasks: delete own"   ON public.tasks;
DROP POLICY IF EXISTS "tasks: select team"  ON public.tasks;
DROP POLICY IF EXISTS "tasks: update team"  ON public.tasks;
DROP POLICY IF EXISTS "tasks: delete team"  ON public.tasks;

CREATE POLICY "tasks: select team"
  ON public.tasks FOR SELECT
  USING (
    user_id        = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR task_owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('leader', 'admin_system')
    )
  );

CREATE POLICY "tasks: update team"
  ON public.tasks FOR UPDATE
  USING (
    user_id        = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR task_owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('leader', 'admin_system')
    )
  )
  WITH CHECK (
    user_id        = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR task_owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('leader', 'admin_system')
    )
  );

CREATE POLICY "tasks: delete team"
  ON public.tasks FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'admin_system'
    )
  );
