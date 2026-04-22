'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type TaskPriority, type ImpactLevel, type UrgencyLevel, type UserRole,
  PRIORITY_CONFIG, IMPACT_CONFIG, URGENCY_CONFIG,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'

interface FilterBarProps {
  role: UserRole
  users: UserOption[]
  currentUserId: string
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'critical', label: 'Crítica' },
  { value: 'high',     label: 'Alta'    },
  { value: 'medium',   label: 'Media'   },
  { value: 'low',      label: 'Baja'    },
]

const IMPACT_OPTIONS: { value: ImpactLevel; label: string }[] = [
  { value: 'critical', label: 'Crítico' },
  { value: 'high',     label: 'Alto'    },
  { value: 'medium',   label: 'Medio'   },
  { value: 'low',      label: 'Bajo'    },
]

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string }[] = [
  { value: 'critical', label: 'Vencida'  },
  { value: 'high',     label: 'Urgente'  },
  { value: 'medium',   label: 'Media'    },
  { value: 'low',      label: 'Baja'     },
]

const selectClass = cn(
  'bg-white/5 border border-white/10 rounded-lg text-xs text-neutral-300',
  'px-2.5 py-1.5 appearance-none cursor-pointer',
  'hover:bg-white/10 hover:border-white/20 transition-colors',
  'focus:outline-none focus:border-blue-500/50',
  '[&>option]:bg-[#1a1a2e]',
)

export function FilterBar({ role, users, currentUserId }: FilterBarProps) {
  const router     = useRouter()
  const pathname   = usePathname()
  const searchParams = useSearchParams()

  const canSeeTeam = role === 'leader' || role === 'admin_system'

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const activeCount = [
    'execution_owner', 'task_owner', 'created_by',
    'priority', 'impact_level', 'urgency', 'overdue',
    'min_tokens', 'max_tokens',
  ].filter((k) => searchParams.has(k)).length

  const v = (key: string) => searchParams.get(key) ?? ''

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 flex-wrap bg-[#0a0a14]/50">
      <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />

      {/* Execution owner */}
      {canSeeTeam && users.length > 0 && (
        <select
          value={v('execution_owner')}
          onChange={(e) => setParam('execution_owner', e.target.value)}
          className={selectClass}
          aria-label="Responsable de ejecución"
        >
          <option value="">Ejecución: todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id.slice(0, 8)}
              {u.id === currentUserId ? ' (yo)' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Task owner */}
      {canSeeTeam && users.length > 0 && (
        <select
          value={v('task_owner')}
          onChange={(e) => setParam('task_owner', e.target.value)}
          className={selectClass}
          aria-label="Propietario de tarea"
        >
          <option value="">Propietario: todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id.slice(0, 8)}
              {u.id === currentUserId ? ' (yo)' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Created by */}
      {canSeeTeam && users.length > 0 && (
        <select
          value={v('created_by')}
          onChange={(e) => setParam('created_by', e.target.value)}
          className={selectClass}
          aria-label="Creado por"
        >
          <option value="">Creado por: todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id.slice(0, 8)}
              {u.id === currentUserId ? ' (yo)' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Priority */}
      <select
        value={v('priority')}
        onChange={(e) => setParam('priority', e.target.value)}
        className={selectClass}
        aria-label="Prioridad"
      >
        <option value="">Prioridad: todas</option>
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Impact */}
      <select
        value={v('impact_level')}
        onChange={(e) => setParam('impact_level', e.target.value)}
        className={selectClass}
        aria-label="Impacto"
      >
        <option value="">Impacto: todos</option>
        {IMPACT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Urgency */}
      <select
        value={v('urgency')}
        onChange={(e) => setParam('urgency', e.target.value)}
        className={selectClass}
        aria-label="Urgencia"
      >
        <option value="">Urgencia: todas</option>
        {URGENCY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{URGENCY_CONFIG[o.value].label}</option>
        ))}
      </select>

      {/* Overdue toggle */}
      <button
        onClick={() => setParam('overdue', v('overdue') === '1' ? null : '1')}
        className={cn(
          'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
          v('overdue') === '1'
            ? 'bg-red-500/20 border-red-500/40 text-red-300'
            : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10',
        )}
      >
        ⚠ Vencidas
      </button>

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors ml-1"
        >
          <X className="w-3 h-3" />
          Limpiar ({activeCount})
        </button>
      )}
    </div>
  )
}
