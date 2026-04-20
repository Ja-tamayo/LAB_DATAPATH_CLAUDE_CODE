'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type Task, type TaskStatus, type TaskPriority } from '@/types/tasks'

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function createTask(
  title: string,
  priority: TaskPriority,
  description?: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get max position to append at the end of "todo"
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('user_id', user.id)
    .eq('status', 'todo')
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title,
    description: description ?? null,
    priority,
    status: 'todo',
    position,
  })

  if (error) {
    const msg = `${error.message} | code: ${error.code} | hint: ${error.hint ?? ''} | details: ${error.details ?? ''}`
    console.error('[createTask] insert error:', msg)
    return { error: msg }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('position')

  return data ?? []
}
