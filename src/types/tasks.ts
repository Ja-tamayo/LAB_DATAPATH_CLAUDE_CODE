export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type ImpactLevel  = 'low' | 'medium' | 'high' | 'critical'
export type UserRole     = 'collaborator' | 'leader' | 'admin_system'
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low'

export interface Task {
  id: string
  user_id: string            // created_by — immutable, set on creation
  task_owner_id: string | null  // functional/business owner (accountable)
  assigned_to: string | null    // execution owner (who does the work)
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  position: number
  impact_level: ImpactLevel | null
  effort_tokens: number | null  // 1 token = 15 min
  due_date: string | null
  estimated_start_date: string | null
  started_at: string | null
  completed_at: string | null
  client: string | null
  project: string | null
  created_at: string
  updated_at: string
}

// ── Time helpers ──────────────────────────────────────────────────────────────

export const tokensToMinutes = (tokens: number): number => tokens * 15
export const tokensToHours   = (tokens: number): number => (tokens * 15) / 60

function parseLocalDate(dateStr: string): Date {
  const [datePart] = dateStr.split('T')
  const parts = datePart.split('-').map(Number)
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return new Date(dateStr)
}

// ── Urgency calculation ───────────────────────────────────────────────────────

export function getUrgency(task: Task): UrgencyLevel {
  if (task.status === 'done') return 'low'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = task.due_date ? parseLocalDate(task.due_date) : null
  if (due) due.setHours(0, 0, 0, 0)
  const daysLeft = due ? Math.round((due.getTime() - today.getTime()) / 86_400_000) : null

  // Overdue
  if (daysLeft !== null && daysLeft < 0) return 'critical'

  // Due today or tomorrow
  if (daysLeft !== null && daysLeft <= 1) return 'high'

  // Critical priority task
  if (task.priority === 'critical') return 'high'

  // High priority + due within 5 days
  if (task.priority === 'high' && daysLeft !== null && daysLeft <= 5) return 'high'

  // Quick win: high/critical impact + low effort (≤ 4 tokens = 1 h)
  if (
    (task.impact_level === 'high' || task.impact_level === 'critical') &&
    (task.effort_tokens ?? 999) <= 4
  ) return 'high'

  // High effort + deadline in 3 days = risk
  if (daysLeft !== null && daysLeft <= 3 && (task.effort_tokens ?? 0) > 8) return 'high'

  // Medium cases ('critical' priority already returned 'high' above — only 'high' can reach here)
  if (task.priority === 'high') return 'medium'
  if (task.impact_level === 'high' || task.impact_level === 'critical') return 'medium'
  if (task.priority === 'medium') return 'medium'

  return 'low'
}

// ── Filter types ──────────────────────────────────────────────────────────────

export interface TaskFilters {
  execution_owner?: string  // maps to assigned_to
  task_owner?: string       // maps to task_owner_id
  created_by?: string       // maps to user_id
  priority?: TaskPriority
  impact_level?: ImpactLevel
  urgency?: UrgencyLevel
  overdue?: boolean
  min_tokens?: number
  max_tokens?: number
}

// ── Config constants ──────────────────────────────────────────────────────────

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

export const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; className: string }> = {
  critical: { label: 'VENCIDA',  className: 'bg-red-600/30 text-red-300'         },
  high:     { label: 'URGENTE',  className: 'bg-orange-500/20 text-orange-400'   },
  medium:   { label: 'MEDIA',    className: 'bg-yellow-500/20 text-yellow-400'   },
  low:      { label: 'BAJA',     className: 'bg-slate-500/20 text-slate-400'     },
}

export const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  collaborator: { label: 'Colaborador', className: 'bg-slate-500/20 text-slate-400'   },
  leader:       { label: 'Líder',       className: 'bg-blue-500/20 text-blue-400'     },
  admin_system: { label: 'Admin',       className: 'bg-violet-500/20 text-violet-400' },
}
