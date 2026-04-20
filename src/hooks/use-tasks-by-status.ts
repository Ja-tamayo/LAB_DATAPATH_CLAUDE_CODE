import { useMemo } from 'react'
import { type Task, type TaskStatus } from '@/types/tasks'

type TasksByStatus = Record<TaskStatus, Task[]>

export function useTasksByStatus(tasks: Task[]): TasksByStatus {
  return useMemo(() => ({
    todo:        tasks.filter((t) => t.status === 'todo').sort((a, b) => a.position - b.position),
    in_progress: tasks.filter((t) => t.status === 'in_progress').sort((a, b) => a.position - b.position),
    done:        tasks.filter((t) => t.status === 'done').sort((a, b) => a.position - b.position),
  }), [tasks])
}
