'use server'

import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  type Task, type TaskStatus, type TaskPriority, type UserRole,
  type TaskFilters, getUrgency,
} from '@/types/tasks'

// Wrapped in try/catch because React cache() re-throws stored errors on every
// subsequent call in the same request — one failure would crash every page.
export const getCurrentUserRole = cache(async (): Promise<UserRole> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) console.error('[getCurrentUserRole] getUser error:', error.message)
    if (!data.user) return 'collaborator'

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return (profile?.role as UserRole) ?? 'collaborator'
  } catch (err) {
    console.error('[getCurrentUserRole] threw:', err)
    return 'collaborator'
  }
})

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
  const supabase = await createClient()

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status: newStatus, updated_at: now }

  if (newStatus === 'in_progress') {
    const { data: current } = await supabase
      .from('tasks')
      .select('started_at')
      .eq('id', taskId)
      .single()
    if (!current?.started_at) updates.started_at = now
  }

  if (newStatus === 'done') {
    updates.completed_at = now
    const { data: current } = await supabase
      .from('tasks')
      .select('started_at')
      .eq('id', taskId)
      .single()
    if (!current?.started_at) updates.started_at = now
  }

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
  taskOwnerId?: string,
  client?: string,
  project?: string,
  impactLevel?: Task['impact_level'],
  effortTokens?: number | null,
  dueDate?: string | null,
  estimatedStartDate?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const role = await getCurrentUserRole()

  const resolvedAssignedTo =
    role === 'collaborator' ? user.id : (assignedTo ?? user.id)
  const resolvedTaskOwner =
    role === 'collaborator' ? user.id : (taskOwnerId ?? resolvedAssignedTo)

  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', 'todo')
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { error } = await supabase.from('tasks').insert({
    user_id:       user.id,
    task_owner_id: resolvedTaskOwner,
    assigned_to:   resolvedAssignedTo,
    title,
    description:   description ?? null,
    priority,
    status:        'todo',
    position,
    impact_level:  impactLevel ?? null,
    effort_tokens: effortTokens ?? null,
    due_date:      dueDate ?? null,
    estimated_start_date: estimatedStartDate ?? null,
    client:        client ?? null,
    project:       project ?? null,
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
  updates: Partial<Pick<
    Task,
    | 'title' | 'description' | 'priority' | 'impact_level' | 'effort_tokens'
    | 'due_date' | 'estimated_start_date' | 'assigned_to' | 'task_owner_id'
    | 'client' | 'project'
  >>,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const role = await getCurrentUserRole()

  const safeUpdates: typeof updates = { ...updates }

  // Server-side guard: only leaders/admins can reassign execution or ownership
  if (role === 'collaborator') {
    delete safeUpdates.assigned_to
    delete safeUpdates.task_owner_id
  }

  const { error } = await supabase
    .from('tasks')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
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

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const supabase = await createClient()

  const { data: authData, error: userErr } = await supabase.auth.getUser()
  if (userErr) console.error('[getTasks] getUser error:', userErr.message)
  if (!authData?.user) return []

  let query = supabase.from('tasks').select('*')

  // DB-level filters
  if (filters?.execution_owner) query = query.eq('assigned_to', filters.execution_owner)
  if (filters?.task_owner)      query = query.eq('task_owner_id', filters.task_owner)
  if (filters?.created_by)      query = query.eq('user_id', filters.created_by)
  if (filters?.priority)        query = query.eq('priority', filters.priority)
  if (filters?.impact_level)    query = query.eq('impact_level', filters.impact_level)
  if (filters?.min_tokens != null) query = query.gte('effort_tokens', filters.min_tokens)
  if (filters?.max_tokens != null) query = query.lte('effort_tokens', filters.max_tokens)

  if (filters?.overdue) {
    const today = new Date().toISOString().split('T')[0]
    query = query.lt('due_date', today).neq('status', 'done')
  }

  const { data } = await query.order('position')
  const tasks = (data ?? []) as Task[]

  // Client-level urgency filter (computed field — can't push to DB)
  if (filters?.urgency) {
    return tasks.filter((t) => getUrgency(t) === filters.urgency)
  }

  return tasks
}
