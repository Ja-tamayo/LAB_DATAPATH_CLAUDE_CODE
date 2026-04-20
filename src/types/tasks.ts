export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  position: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'Por hacer'   },
  { status: 'in_progress', label: 'En progreso' },
  { status: 'done',        label: 'Terminado'   },
]

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low:      { label: 'BAJA',    className: 'bg-green-500/20 text-green-400'  },
  medium:   { label: 'MEDIA',   className: 'bg-yellow-500/20 text-yellow-400' },
  high:     { label: 'ALTA',    className: 'bg-red-500/20 text-red-400'      },
  critical: { label: 'CRÍTICA', className: 'bg-red-600/30 text-red-300'      },
}
