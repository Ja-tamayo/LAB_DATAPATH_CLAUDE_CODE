import { redirect } from 'next/navigation'
import { User, LogOut, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { logout } from '@/actions/auth'
import { KanbanBoard } from '@/components/kanban-board'
import { ChatDrawer } from '@/components/chat-drawer'
import { SyncEmbeddingsButton } from '@/components/sync-embeddings-button'
import { NewTaskDialog } from '@/components/new-task-dialog'
import { type UserRole } from '@/types/tasks'

export const metadata = {
  title: 'Dashboard — TaskFlow AI',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [tasks, role, users] = await Promise.all([
    getTasks(),
    getCurrentUserRole(),
    getUsers(),
  ])

  const canAccessOperational = role === 'leader' || role === 'admin_system'

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <span className="text-lg font-semibold">
            TaskFlow <span className="text-blue-400">AI</span>
          </span>
        </div>

        {/* Actions — right side */}
        <div className="flex items-center gap-2">
          <ChatDrawer />
          <div className="w-px h-5 bg-white/10 mx-1" />

          {canAccessOperational && (
            <Link
              href="/dashboard/operational"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Operacional</span>
            </Link>
          )}

          <NewTaskDialog
            role={role as UserRole}
            users={users}
            currentUserId={user.id}
          />
          <SyncEmbeddingsButton role={role as UserRole} />

          <div className="w-px h-5 bg-white/10 mx-1" />
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <User className="w-3.5 h-3.5" />
            <span className="hidden md:inline max-w-[160px] truncate">{user.email}</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>

      {/* ── Kanban ────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 overflow-auto">
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
