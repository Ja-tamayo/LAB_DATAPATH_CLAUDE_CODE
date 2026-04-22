-- task_owner_id: functional/business owner of the task
-- (distinct from assigned_to = execution owner = who does the work)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: existing tasks default task_owner to creator
UPDATE public.tasks SET task_owner_id = user_id WHERE task_owner_id IS NULL;

-- Index for performant workload queries
CREATE INDEX IF NOT EXISTS tasks_task_owner_id_idx ON public.tasks(task_owner_id);

-- weekly_capacity_tokens: how many tokens/week this person can handle
-- default 40 tokens = 600 min = 10 hours/week of tasked work
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_capacity_tokens integer NOT NULL DEFAULT 40
    CONSTRAINT weekly_capacity_tokens_positive CHECK (weekly_capacity_tokens > 0);

-- Extend collaborator SELECT policy so task_owner_id grants visibility too
DROP POLICY IF EXISTS "tasks: select role-aware" ON public.tasks;
CREATE POLICY "tasks: select role-aware"
  ON public.tasks FOR SELECT
  USING (
    get_my_role() IN ('leader', 'admin_system')
    OR assigned_to   = (SELECT auth.uid())
    OR user_id       = (SELECT auth.uid())
    OR task_owner_id = (SELECT auth.uid())
  );
