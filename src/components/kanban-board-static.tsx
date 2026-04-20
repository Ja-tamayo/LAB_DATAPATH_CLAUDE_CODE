import { Circle, CheckCircle2, MoreHorizontal, Plus, User } from 'lucide-react'
import { type Task, type TaskStatus, KANBAN_COLUMNS } from '@/types/tasks'
import { TaskCard } from '@/components/task-card'

interface KanbanBoardStaticProps {
  tasks: Task[]
  userEmail: string
}

const COLUMN_ICON: Record<TaskStatus, React.ReactNode> = {
  todo:        <Circle        className="w-5 h-5 text-neutral-500" />,
  in_progress: <Circle        className="w-5 h-5 text-blue-400 fill-none [stroke-dasharray:4_2]" />,
  done:        <CheckCircle2  className="w-5 h-5 text-green-400" />,
}

export function KanbanBoardStatic({ tasks, userEmail }: KanbanBoardStaticProps) {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <span className="text-xl font-semibold">
            TaskFlow <span className="text-blue-400">AI</span>
          </span>
        </div>

        <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>

        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <User className="w-5 h-5 text-neutral-400" />
          <span>{userEmail}</span>
          <span className="text-neutral-500">▾</span>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasks
              .filter((t) => t.status === col.status)
              .sort((a, b) => a.position - b.position)

            return (
              <div
                key={col.status}
                className="bg-white/5 border border-white/10 rounded-xl flex flex-col"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {COLUMN_ICON[col.status]}
                    <span className="font-medium text-white">{col.label}</span>
                    <span className="bg-white/10 text-neutral-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  <button className="text-neutral-500 hover:text-neutral-300 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-3 flex-1">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
