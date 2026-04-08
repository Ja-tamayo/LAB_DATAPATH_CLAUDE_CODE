create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.task_status   as enum ('todo', 'in_progress', 'done', 'archived');

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  priority    public.task_priority not null default 'medium',
  status      public.task_status   not null default 'todo',
  position    integer not null default 0,
  due_date    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

create index tasks_user_id_status_idx on public.tasks (user_id, status);

alter table public.tasks enable row level security;
