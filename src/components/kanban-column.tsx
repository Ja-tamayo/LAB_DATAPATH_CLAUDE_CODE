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
}

export function KanbanColumn({ id, label, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="font-medium text-white">{label}</span>
        <span className="bg-white/10 text-neutral-400 text-xs font-semibold px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 min-h-96 rounded-xl border p-3 flex flex-col gap-2',
            'transition-colors duration-200',
            isOver
              ? 'border-blue-500/50 bg-blue-500/5'
              : 'border-white/10 bg-white/5'
          )}
        >
          {tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs text-neutral-600">Suelta aquí</span>
            </div>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}
