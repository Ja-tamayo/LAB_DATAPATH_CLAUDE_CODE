-- Tareas del Usuario A
insert into public.tasks (user_id, title, description, priority, status, position)
values
  ('ae89e9cd-a32b-4e13-9b29-de90077f5653', 'Configurar Supabase',    'Setup inicial del proyecto',     'high',   'todo',        1),
  ('ae89e9cd-a32b-4e13-9b29-de90077f5653', 'Crear componente Kanban', 'UI con drag and drop',           'high',   'in_progress', 2),
  ('ae89e9cd-a32b-4e13-9b29-de90077f5653', 'Implementar RAG',         'Chat con contexto de tareas',    'medium', 'todo',        3);

-- Tareas del Usuario B
insert into public.tasks (user_id, title, description, priority, status, position)
values
  ('562e13a1-5a93-4b2b-97eb-ef3769ea2988', 'Revisar documentacion',   'Leer docs de Next.js 15',        'low',    'todo',        1),
  ('562e13a1-5a93-4b2b-97eb-ef3769ea2988', 'Preparar presentacion',   'Demo final del curso',           'high',   'in_progress', 2);
