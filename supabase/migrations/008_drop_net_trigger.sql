-- Drop embedding trigger until pg_net extension is enabled in this project.
-- To re-enable: go to Supabase Dashboard → Database → Extensions → enable pg_net,
-- then recreate the trigger from 007_embed_trigger.sql.
DROP TRIGGER IF EXISTS tasks_embed_on_insert_or_update ON public.tasks;
DROP FUNCTION IF EXISTS public.trigger_task_embedding();
