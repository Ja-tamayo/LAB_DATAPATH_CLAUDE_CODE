import { redirect } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/actions/tasks'
import { logout } from '@/actions/auth'
import { KanbanBoard } from '@/components/kanban-board'
import { ChatDrawer } from '@/components/chat-drawer'
import { SyncEmbeddingsButton } from '@/components/sync-embeddings-button'
import { NewTaskDialog } from '@/components/new-task-dialog'

export const metadata = {
  title: 'Dashboard — TaskFlow AI',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tasks = await getTasks()

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
          <NewTaskDialog />
          <SyncEmbeddingsButton />
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

      {/* ── Kanban — full width ────────────────────────────────────────────── */}
      <main className="flex-1 p-6 overflow-auto">
        <KanbanBoard initialTasks={tasks} />
      </main>

    </div>
  )
}
