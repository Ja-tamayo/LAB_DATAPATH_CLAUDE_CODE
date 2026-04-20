'use client'

import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { type Task, KANBAN_COLUMNS } from '@/types/tasks'
import { useMoveTask } from '@/hooks/use-move-task'
import { useTasksByStatus } from '@/hooks/use-tasks-by-status'
import { useKanbanDnd } from '@/hooks/use-kanban-dnd'
import { KanbanColumn } from '@/components/kanban-column'
import { TaskCard } from '@/components/task-card'

interface KanbanBoardProps {
  initialTasks: Task[]
}

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const { tasks, moveTask } = useMoveTask(initialTasks)
  const tasksByStatus = useTasksByStatus(tasks)
  const { sensors, activeTask, handleDragStart, handleDragEnd } = useKanbanDnd(tasks, moveTask)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn key={col.status} id={col.status} label={col.label} tasks={tasksByStatus[col.status]} />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <div className="rotate-3 shadow-2xl"><TaskCard task={activeTask} isDragging /></div>}
      </DragOverlay>
    </DndContext>
  )
}
