'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type Task, type TaskStatus, type TaskPriority, type UserRole } from '@/types/tasks'

export async function getCurrentUserRole(): Promise<UserRole> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'collaborator'

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as UserRole) ?? 'collaborator'
}

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
  const supabase = await createClient()

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status: newStatus, updated_at: now }

  // Lifecycle: set started_at when moving to in_progress (only if not already set)
  if (newStatus === 'in_progress') {
    const { data: current } = await supabase
      .from('tasks')
      .select('started_at')
      .eq('id', taskId)
      .single()
    if (!current?.started_at) updates.started_at = now
  }

  // Lifecycle: set completed_at when moving to done
  if (newStatus === 'done') {
    updates.completed_at = now
    // Also set started_at if it was never set
    const { data: current } = await supabase
      .from('tasks')
      .select('started_at')
      .eq('id', taskId)
      .single()
    if (!current?.started_at) updates.started_at = now
  }

  // Lifecycle: clear completed_at when moving back from done
  if (newStatus === 'todo' || newStatus === 'in_progress') {
    updates.completed_at = null
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function createTask(
  title: string,
  priority: TaskPriority,
  description?: string,
  assignedTo?: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const role = await getCurrentUserRole()

  // Collaborators can only assign to themselves
  const resolvedAssignedTo =
    role === 'collaborator' ? user.id : (assignedTo ?? user.id)

  // Get max position for the todo column
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', 'todo')
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { error } = await supabase.from('tasks').insert({
    user_id:     user.id,
    assigned_to: resolvedAssignedTo,
    title,
    description: description ?? null,
    priority,
    status:   'todo',
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

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'impact_level' | 'effort_tokens' | 'due_date' | 'estimated_start_date' | 'assigned_to'>>,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // RLS handles role-based scoping automatically:
  // - collaborator: sees only tasks where assigned_to = uid OR user_id = uid
  // - leader/admin_system: sees all tasks
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .order('position')

  return (data ?? []) as Task[]
}
