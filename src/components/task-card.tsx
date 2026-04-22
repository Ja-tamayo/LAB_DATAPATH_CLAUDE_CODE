import { Check, GripVertical, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Task, PRIORITY_CONFIG, URGENCY_CONFIG, tokensToHours, getUrgency } from '@/types/tasks'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onClick?: () => void
}

function getInitials(id: string): string {
  return id.slice(0, 2).toUpperCase()
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

export function TaskCard({ task, isDragging = false, onClick }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const overdue  = task.status !== 'done' && isOverdue(task.due_date)
  const urgency  = getUrgency(task)
  const urgencyConfig = URGENCY_CONFIG[urgency]

  // Show urgency badge only if urgency adds info beyond priority alone
  const showUrgency = urgency === 'critical' || (urgency === 'high' && task.priority !== 'critical')

  // Separate avatar badges: task owner vs execution owner
  const hasDistinctOwner    = task.task_owner_id && task.task_owner_id !== task.user_id
  const hasDistinctExecutor = task.assigned_to   && task.assigned_to   !== task.task_owner_id && task.assigned_to !== task.user_id

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white/5 border rounded-md px-2.5 py-2',
        'cursor-grab active:cursor-grabbing',
        'flex items-start gap-1.5 transition-all',
        urgency === 'critical' ? 'border-red-500/30' : 'border-white/5',
        onClick && 'hover:bg-white/8 hover:border-white/10',
        isDragging && 'opacity-50 rotate-2 shadow-xl scale-105',
      )}
    >
      <div className="flex-1 min-w-0">
        {/* Priority + urgency badges in one compact row */}
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          <span className={cn(
            'inline-block px-1 py-px rounded text-[9px] font-semibold tracking-wide',
            priority.className,
          )}>
            {priority.label}
          </span>
          {showUrgency && (
            <span className={cn(
              'inline-block px-1 py-px rounded text-[9px] font-semibold tracking-wide',
              urgencyConfig.className,
            )}>
              {urgencyConfig.label}
            </span>
          )}
          {task.status === 'done' && (
            <Check className="w-3 h-3 text-green-400 shrink-0" />
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-medium text-white leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* Description — single line only */}
        {task.description && (
          <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Footer meta */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-0.5 text-[9px]',
              overdue ? 'text-red-400' : 'text-neutral-600',
            )}>
              <Calendar className="w-2 h-2" />
              {formatDate(task.due_date)}
            </span>
          )}

          {task.effort_tokens != null && task.effort_tokens > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-neutral-600">
              <Clock className="w-2 h-2" />
              {tokensToHours(task.effort_tokens) >= 1
                ? `${tokensToHours(task.effort_tokens).toFixed(1)}h`
                : `${task.effort_tokens * 15}m`}
            </span>
          )}

          {/* Owner avatars */}
          {(hasDistinctOwner || hasDistinctExecutor) && (
            <div className="ml-auto flex items-center gap-0.5">
              {hasDistinctOwner && (
                <span
                  title="Propietario de tarea"
                  className="w-4 h-4 rounded-full bg-violet-600/30 text-violet-300 text-[8px] font-bold flex items-center justify-center shrink-0"
                >
                  {getInitials(task.task_owner_id!)}
                </span>
              )}
              {hasDistinctExecutor && (
                <span
                  title="Responsable de ejecución"
                  className="w-4 h-4 rounded-full bg-blue-600/30 text-blue-300 text-[8px] font-bold flex items-center justify-center shrink-0"
                >
                  {getInitials(task.assigned_to!)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <GripVertical className="w-3 h-3 text-neutral-600 shrink-0 mt-0.5" />
    </div>
  )
}
