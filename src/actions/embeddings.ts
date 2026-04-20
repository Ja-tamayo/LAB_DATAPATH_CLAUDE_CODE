'use server'

import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/embeddings'
import { buildTaskContent } from '@/lib/embed-task'
import { type Task } from '@/types/tasks'

/** Embebe una tarea y hace delete+insert en task_embeddings */
export async function embedUserTask(task: Task): Promise<void> {
  const supabase = await createClient()
  const content = buildTaskContent(task)
  const embedding = await generateEmbedding(content, 'document')

  await supabase.from('task_embeddings').delete().eq('task_id', task.id)
  const { error } = await supabase
    .from('task_embeddings')
    .insert({ task_id: task.id, user_id: task.user_id, content, embedding })

  if (error) throw new Error(error.message)
}

/** Embebe todas las tareas en un solo request a Voyage AI */
export async function embedAllUserTasks(): Promise<{ ok: number; fail: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  if (!tasks || tasks.length === 0) return { ok: 0, fail: 0 }

  const typedTasks = tasks as Task[]
  const contents = typedTasks.map(buildTaskContent)

  // Un solo request para todas las tareas — sin rate limit
  const embeddings = await generateEmbeddingsBatch(contents, 'document')

  // Borra todos los embeddings anteriores del usuario y los reinserta
  await supabase.from('task_embeddings').delete().eq('user_id', user.id)

  const rows = typedTasks.map((task, i) => ({
    task_id: task.id,
    user_id: task.user_id,
    content: contents[i],
    embedding: embeddings[i],
  }))

  const { error: insertError } = await supabase
    .from('task_embeddings')
    .insert(rows)

  if (insertError) throw new Error(insertError.message)

  return { ok: typedTasks.length, fail: 0 }
}
