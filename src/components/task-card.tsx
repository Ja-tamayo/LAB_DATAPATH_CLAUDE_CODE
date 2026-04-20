import { Check, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Task, PRIORITY_CONFIG } from '@/types/tasks'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]

  return (
    <div
      className={cn(
        'bg-white/5 border border-white/5 rounded-lg p-3',
        'cursor-grab active:cursor-grabbing',
        'flex items-start gap-2 transition-all',
        isDragging && 'opacity-50 rotate-2 shadow-xl scale-105'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={cn(
              'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide',
              priority.className
            )}
          >
            {priority.label}
          </span>

          {task.status === 'done' && (
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
          )}
        </div>

        <p className="text-sm font-medium text-white leading-snug">
          {task.title}
        </p>

        {task.description && (
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      <GripVertical className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
    </div>
  )
}
