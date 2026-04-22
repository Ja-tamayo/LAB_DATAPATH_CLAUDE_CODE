import { Check, GripVertical, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Task, PRIORITY_CONFIG, tokensToHours } from '@/types/tasks'

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

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white/5 border border-white/5 rounded-lg p-3',
        'cursor-grab active:cursor-grabbing',
        'flex items-start gap-2 transition-all',
        onClick && 'hover:bg-white/8 hover:border-white/10',
        isDragging && 'opacity-50 rotate-2 shadow-xl scale-105',
      )}
    >
      <div className="flex-1 min-w-0">
        {/* Priority + done check */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide',
            priority.className,
          )}>
            {priority.label}
          </span>
          {task.status === 'done' && (
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-white leading-snug">
          {task.title}
        </p>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Footer meta */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Due date */}
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-0.5 text-[10px]',
              overdue ? 'text-red-400' : 'text-neutral-500',
            )}>
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(task.due_date)}
            </span>
          )}

          {/* Effort tokens */}
          {task.effort_tokens != null && task.effort_tokens > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-neutral-500">
              <Clock className="w-2.5 h-2.5" />
              {tokensToHours(task.effort_tokens) >= 1
                ? `${tokensToHours(task.effort_tokens).toFixed(1)}h`
                : `${task.effort_tokens * 15}m`}
            </span>
          )}

          {/* Assigned to initials */}
          {task.assigned_to && task.assigned_to !== task.user_id && (
            <span className="ml-auto w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 text-[9px] font-bold flex items-center justify-center shrink-0">
              {getInitials(task.assigned_to)}
            </span>
          )}
        </div>
      </div>

      <GripVertical className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
    </div>
  )
}
