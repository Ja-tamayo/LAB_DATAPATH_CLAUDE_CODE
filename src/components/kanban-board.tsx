'use client'

import { useState, useId } from 'react'
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { type Task, type UserRole, KANBAN_COLUMNS } from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { useMoveTask } from '@/hooks/use-move-task'
import { useTasksByStatus } from '@/hooks/use-tasks-by-status'
import { useKanbanDnd } from '@/hooks/use-kanban-dnd'
import { KanbanColumn } from '@/components/kanban-column'
import { TaskCard } from '@/components/task-card'
import { TaskDetailDrawer } from '@/components/task-detail-drawer'

interface KanbanBoardProps {
  initialTasks: Task[]
  role?: UserRole
  users?: UserOption[]
  currentUserId?: string
}

export function KanbanBoard({
  initialTasks,
  role = 'collaborator',
  users = [],
  currentUserId = '',
}: KanbanBoardProps) {
  const dndId = useId()
  const { tasks, moveTask, isDragging } = useMoveTask(initialTasks)
  const tasksByStatus = useTasksByStatus(tasks)
  const { sensors, activeTask, handleDragStart, handleDragEnd } = useKanbanDnd(tasks, moveTask, isDragging)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              id={col.status}
              label={col.label}
              tasks={tasksByStatus[col.status]}
              onClickTask={setSelectedTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 shadow-2xl">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          role={role}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onChanged={() => setSelectedTask(null)}
        />
      )}
    </>
  )
}
