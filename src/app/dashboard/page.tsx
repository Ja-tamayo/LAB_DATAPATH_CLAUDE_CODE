import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { ChatDrawer } from '@/components/chat-drawer'
import { SyncEmbeddingsButton } from '@/components/sync-embeddings-button'
import { NewTaskDialog } from '@/components/new-task-dialog'
import { KanbanBoard } from '@/components/kanban-board'
import { FilterBar } from '@/components/filter-bar'
import {
  type UserRole, type TaskPriority, type ImpactLevel, type UrgencyLevel, type TaskFilters,
} from '@/types/tasks'

export const metadata = {
  title: 'Board — TaskFlow AI',
}

type SearchParams = Record<string, string | string[] | undefined>

function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key]
  return typeof v === 'string' ? v : undefined
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const filters: TaskFilters = {}
  if (sp(params, 'execution_owner')) filters.execution_owner = sp(params, 'execution_owner')
  if (sp(params, 'task_owner'))      filters.task_owner      = sp(params, 'task_owner')
  if (sp(params, 'created_by'))      filters.created_by      = sp(params, 'created_by')
  if (sp(params, 'priority'))        filters.priority        = sp(params, 'priority') as TaskPriority
  if (sp(params, 'impact_level'))    filters.impact_level    = sp(params, 'impact_level') as ImpactLevel
  if (sp(params, 'urgency'))         filters.urgency         = sp(params, 'urgency') as UrgencyLevel
  if (params.overdue === '1')        filters.overdue         = true
  if (sp(params, 'min_tokens'))      filters.min_tokens      = parseInt(sp(params, 'min_tokens')!)
  if (sp(params, 'max_tokens'))      filters.max_tokens      = parseInt(sp(params, 'max_tokens')!)

  const [tasks, role, users] = await Promise.all([
    getTasks(filters),
    getCurrentUserRole(),
    getUsers(),
  ])

  return (
    <div className="flex flex-col h-full min-h-screen">

      {/* Page header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <h1 className="text-sm font-medium text-neutral-300">Board</h1>
        <div className="flex items-center gap-2">
          <ChatDrawer />
          <div className="w-px h-4 bg-white/10" />
          <NewTaskDialog
            role={role as UserRole}
            users={users}
            currentUserId={user.id}
          />
          <SyncEmbeddingsButton role={role as UserRole} />
        </div>
      </header>

      {/* Filter bar — needs Suspense for useSearchParams */}
      <Suspense fallback={<div className="h-10 border-b border-white/5" />}>
        <FilterBar
          role={role as UserRole}
          users={users}
          currentUserId={user.id}
        />
      </Suspense>

      {/* Kanban board */}
      <main className="flex-1 p-4 overflow-auto">
        <KanbanBoard
          initialTasks={tasks}
          role={role as UserRole}
          users={users}
          currentUserId={user.id}
        />
      </main>
    </div>
  )
}
