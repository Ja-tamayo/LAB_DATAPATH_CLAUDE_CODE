-- Role helper: SECURITY DEFINER to avoid RLS recursion.
-- Returns 'collaborator' if no profile exists (safe fallback).
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'collaborator'
  )
$$;

-- ── Tasks ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tasks: select own" ON public.tasks;
DROP POLICY IF EXISTS "tasks: insert own" ON public.tasks;
DROP POLICY IF EXISTS "tasks: update own" ON public.tasks;
DROP POLICY IF EXISTS "tasks: delete own" ON public.tasks;

-- leader/admin_system see all tasks; collaborator sees tasks they created or are assigned to
CREATE POLICY "tasks: select role-aware"
  ON public.tasks FOR SELECT
  USING (
    get_my_role() IN ('leader', 'admin_system')
    OR assigned_to = (SELECT auth.uid())
    OR user_id     = (SELECT auth.uid())
  );

-- creator must always be the current user;
-- collaborator can only assign to themselves
CREATE POLICY "tasks: insert role-aware"
  ON public.tasks FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      get_my_role() IN ('leader', 'admin_system')
      OR assigned_to = (SELECT auth.uid())
    )
  );

-- leader/admin can update any task; others only tasks they own or are assigned to
CREATE POLICY "tasks: update role-aware"
  ON public.tasks FOR UPDATE
  USING (
    get_my_role() IN ('leader', 'admin_system')
    OR assigned_to = (SELECT auth.uid())
    OR user_id     = (SELECT auth.uid())
  )
  WITH CHECK (
    get_my_role() IN ('leader', 'admin_system')
    OR assigned_to = (SELECT auth.uid())
    OR user_id     = (SELECT auth.uid())
  );

-- only admin_system or the original creator can delete
CREATE POLICY "tasks: delete role-aware"
  ON public.tasks FOR DELETE
  USING (
    get_my_role() = 'admin_system'
    OR user_id = (SELECT auth.uid())
  );

-- ── Task embeddings ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "task_embeddings: select own" ON public.task_embeddings;

-- leader/admin_system can search across all embeddings (scoped by what tasks RLS allows)
CREATE POLICY "task_embeddings: select role-aware"
  ON public.task_embeddings FOR SELECT
  USING (
    get_my_role() IN ('leader', 'admin_system')
    OR user_id = (SELECT auth.uid())
  );

-- insert and delete remain restricted to the embedding owner (no change needed,
-- existing policies already enforce this correctly)
