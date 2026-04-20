'use client'

import { useState } from 'react'
import type React from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { type Task, type TaskStatus } from '@/types/tasks'

const VALID_STATUSES = ['todo', 'in_progress', 'done'] as const

export function useKanbanDnd(
  tasks: Task[],
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>,
  isDragging: React.MutableRefObject<boolean>,
) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    isDragging.current = true
    const task = tasks.find((t) => t.id === event.active.id) ?? null
    setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    isDragging.current = false
    setActiveTask(null)

    if (!over) return

    const task = tasks.find((t) => t.id === active.id)
    if (!task) return

    const isColumn = (VALID_STATUSES as readonly string[]).includes(over.id as string)
    const newStatus: TaskStatus = isColumn
      ? (over.id as TaskStatus)
      : (tasks.find((t) => t.id === over.id)?.status ?? task.status)

    if (task.status === newStatus) return

    await moveTask(task.id, newStatus)
  }

  return { sensors, activeTask, handleDragStart, handleDragEnd }
}
