-- Llama a la Edge Function embed-task cada vez que una tarea se crea o actualiza.
-- Reemplaza YOUR_PROJECT_REF con tu project ref de Supabase (ej: govajfvdbmdwuvfoozmd)
-- Reemplaza YOUR_ANON_KEY con tu NEXT_PUBLIC_SUPABASE_ANON_KEY

create or replace function public.trigger_task_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/embed-task',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body    := jsonb_build_object(
      'id',          NEW.id,
      'user_id',     NEW.user_id,
      'title',       NEW.title,
      'description', NEW.description,
      'status',      NEW.status,
      'priority',    NEW.priority
    )
  );
  return NEW;
end;
$$;

create trigger tasks_embed_on_insert_or_update
  after insert or update of title, description, status, priority
  on public.tasks
  for each row
  execute function public.trigger_task_embedding();
