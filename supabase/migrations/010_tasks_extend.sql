-- New enum for impact level
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'impact_level') THEN
    CREATE TYPE public.impact_level AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

-- Extend tasks table with new columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to           uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS impact_level          public.impact_level,
  ADD COLUMN IF NOT EXISTS effort_tokens         integer CHECK (effort_tokens >= 0),
  ADD COLUMN IF NOT EXISTS estimated_start_date  date,
  ADD COLUMN IF NOT EXISTS started_at            timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at          timestamptz;

-- Backfill: existing tasks self-assigned to their creator
UPDATE public.tasks SET assigned_to = user_id WHERE assigned_to IS NULL;

-- Index for assigned_to queries
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);
