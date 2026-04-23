-- Clients and Projects registry — idempotent, safe to re-run

CREATE TABLE IF NOT EXISTS public.clients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers (idempotent)
DROP TRIGGER IF EXISTS clients_updated_at  ON public.clients;
DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER clients_updated_at  BEFORE UPDATE ON public.clients  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "clients: select"  ON public.clients;
DROP POLICY IF EXISTS "projects: select" ON public.projects;
DROP POLICY IF EXISTS "clients: manage"  ON public.clients;
DROP POLICY IF EXISTS "projects: manage" ON public.projects;

-- All authenticated users can read
CREATE POLICY "clients: select"  ON public.clients  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "projects: select" ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only leaders / admins can write
CREATE POLICY "clients: manage"  ON public.clients  FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('leader','admin_system')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('leader','admin_system')));

CREATE POLICY "projects: manage" ON public.projects FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('leader','admin_system')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('leader','admin_system')));
