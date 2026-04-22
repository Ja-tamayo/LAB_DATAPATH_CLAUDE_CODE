export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type ImpactLevel  = 'low' | 'medium' | 'high' | 'critical'
export type UserRole     = 'collaborator' | 'leader' | 'admin_system'

export interface Task {
  id: string
  user_id: string               // created_by — preserved for backward compat
  assigned_to: string | null
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  position: number
  impact_level: ImpactLevel | null
  effort_tokens: number | null  // 1 token = 15 min
  due_date: string | null       // = estimated_due_date
  estimated_start_date: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Derived time calculations
export const tokensToMinutes = (tokens: number): number => tokens * 15
export const tokensToHours   = (tokens: number): number => (tokens * 15) / 60

export const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'Por hacer'   },
  { status: 'in_progress', label: 'En progreso' },
  { status: 'done',        label: 'Terminado'   },
]

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low:      { label: 'BAJA',    className: 'bg-green-500/20 text-green-400'   },
  medium:   { label: 'MEDIA',   className: 'bg-yellow-500/20 text-yellow-400' },
  high:     { label: 'ALTA',    className: 'bg-red-500/20 text-red-400'       },
  critical: { label: 'CRÍTICA', className: 'bg-red-600/30 text-red-300'       },
}

export const IMPACT_CONFIG: Record<ImpactLevel, { label: string; className: string }> = {
  low:      { label: 'BAJO',    className: 'bg-slate-500/20 text-slate-400'   },
  medium:   { label: 'MEDIO',   className: 'bg-blue-500/20 text-blue-400'     },
  high:     { label: 'ALTO',    className: 'bg-violet-500/20 text-violet-400' },
  critical: { label: 'CRÍTICO', className: 'bg-pink-600/30 text-pink-300'     },
}

export const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  collaborator: { label: 'Colaborador', className: 'bg-slate-500/20 text-slate-400'   },
  leader:       { label: 'Líder',       className: 'bg-blue-500/20 text-blue-400'     },
  admin_system: { label: 'Admin',       className: 'bg-violet-500/20 text-violet-400' },
}
