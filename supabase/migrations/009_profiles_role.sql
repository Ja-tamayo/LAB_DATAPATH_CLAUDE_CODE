ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'collaborator'
    CONSTRAINT profiles_role_check
      CHECK (role IN ('collaborator', 'leader', 'admin_system'));
