'use client'

import { useState, useEffect, useRef } from 'react'
import { type Task, type TaskStatus } from '@/types/tasks'
import { updateTaskStatus } from '@/actions/tasks'

export function useMoveTask(initialTasks: Task[]) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const isDragging = useRef(false)

  // Sync when server refreshes data (e.g. after chat creates/moves a task)
  useEffect(() => {
    if (!isDragging.current) setTasks(initialTasks)
  }, [initialTasks])

  async function moveTask(taskId: string, newStatus: TaskStatus): Promise<void> {
    const previous = [...tasks]

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      await updateTaskStatus(taskId, newStatus)
    } catch {
      setTasks(previous)
    }
  }

  return { tasks, moveTask, isDragging }
}
