CREATE OR REPLACE FUNCTION match_task_embeddings(
  query_embedding halfvec(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  task_id    UUID,
  content    TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
SECURITY INVOKER
AS $$
  SELECT
    te.task_id,
    te.content,
    1 - (te.embedding <=> query_embedding) AS similarity
  FROM task_embeddings te
  WHERE (1 - (te.embedding <=> query_embedding)) > match_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
$$;
