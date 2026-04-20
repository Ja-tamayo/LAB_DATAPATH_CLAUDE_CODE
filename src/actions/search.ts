'use server'

import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings'

export interface SearchResult {
  task_id: string
  content: string
  similarity: number
}

export async function searchTasks(query: string): Promise<SearchResult[]> {
  const [embedding, supabase] = await Promise.all([
    generateEmbedding(query, 'query'),
    createClient(),
  ])

  const { data, error } = await supabase.rpc('match_task_embeddings', {
    query_embedding: embedding,
    match_threshold: 0.4,
    match_count: 5,
  })

  if (error) throw new Error(error.message)

  return (data ?? []) as SearchResult[]
}
