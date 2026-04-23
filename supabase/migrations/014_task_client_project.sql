ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS client  text,
  ADD COLUMN IF NOT EXISTS project text;
