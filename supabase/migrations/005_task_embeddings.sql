CREATE TABLE public.task_embeddings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  content    TEXT NOT NULL,
  embedding  halfvec(1024) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_embeddings: select own"
  ON public.task_embeddings FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "task_embeddings: insert own"
  ON public.task_embeddings FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "task_embeddings: delete own"
  ON public.task_embeddings FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX ON public.task_embeddings
  USING hnsw (embedding halfvec_cosine_ops);
