'use client'

import { useState } from 'react'
import { type Task, type TaskStatus } from '@/types/tasks'
import { updateTaskStatus } from '@/actions/tasks'

export function useMoveTask(initialTasks: Task[]) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

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

  return { tasks, moveTask }
}
