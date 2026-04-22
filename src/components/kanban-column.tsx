'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { type Task, type TaskStatus } from '@/types/tasks'
import { SortableTaskCard } from '@/components/sortable-task-card'

interface KanbanColumnProps {
  id: TaskStatus
  label: string
  tasks: Task[]
  onClickTask?: (task: Task) => void
}

export function KanbanColumn({ id, label, tasks, onClickTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">{label}</span>
        <span className="bg-white/10 text-neutral-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'rounded-lg border p-2 flex flex-col gap-1.5',
            'h-[calc(100vh-160px)] overflow-y-auto',
            'transition-colors duration-200',
            isOver
              ? 'border-blue-500/50 bg-blue-500/5'
              : 'border-white/10 bg-white/[0.03]'
          )}
        >
          {tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs text-neutral-600">Suelta aquí</span>
            </div>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} onClickTask={onClickTask} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}
