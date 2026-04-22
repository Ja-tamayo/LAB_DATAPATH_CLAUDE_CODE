'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type TaskPriority, type ImpactLevel, type UrgencyLevel, type UserRole,
  URGENCY_CONFIG,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'

interface FilterBarProps {
  role: UserRole
  users: UserOption[]
  currentUserId: string
}

const selectClass = cn(
  'bg-transparent border border-white/10 rounded-md text-[11px] text-neutral-400',
  'px-2 py-1 appearance-none cursor-pointer',
  'hover:border-white/20 hover:text-neutral-200 transition-colors',
  'focus:outline-none focus:border-blue-500/40',
  '[&>option]:bg-[#1a1a2e]',
)

function Sep() {
  return <span className="w-px h-4 bg-white/10 shrink-0" />
}

export function FilterBar({ role, users, currentUserId }: FilterBarProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const canSeeTeam = role === 'leader' || role === 'admin_system'

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value) params.delete(key)
      else params.set(key, value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const activeCount = [
    'execution_owner', 'task_owner', 'priority', 'impact_level', 'urgency', 'overdue',
  ].filter((k) => searchParams.has(k)).length

  const v = (key: string) => searchParams.get(key) ?? ''

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-white/5 flex-wrap bg-[#0a0a14]/40 min-h-[36px]">

      {/* ── People filters (leader/admin only) ── */}
      {canSeeTeam && users.length > 0 && (
        <>
          <select
            value={v('execution_owner')}
            onChange={(e) => setParam('execution_owner', e.target.value)}
            className={selectClass}
          >
            <option value="">Ejecución: todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId ? ' (yo)' : ''}
              </option>
            ))}
          </select>

          <select
            value={v('task_owner')}
            onChange={(e) => setParam('task_owner', e.target.value)}
            className={selectClass}
          >
            <option value="">Propietario: todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId ? ' (yo)' : ''}
              </option>
            ))}
          </select>

          <Sep />
        </>
      )}

      {/* ── Classification filters ── */}
      <select
        value={v('priority')}
        onChange={(e) => setParam('priority', e.target.value)}
        className={selectClass}
      >
        <option value="">Prioridad: todas</option>
        {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
          <option key={p} value={p}>{p === 'critical' ? 'Crítica' : p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}</option>
        ))}
      </select>

      <select
        value={v('impact_level')}
        onChange={(e) => setParam('impact_level', e.target.value)}
        className={selectClass}
      >
        <option value="">Impacto: todos</option>
        {(['critical', 'high', 'medium', 'low'] as ImpactLevel[]).map((i) => (
          <option key={i} value={i}>{i === 'critical' ? 'Crítico' : i === 'high' ? 'Alto' : i === 'medium' ? 'Medio' : 'Bajo'}</option>
        ))}
      </select>

      <select
        value={v('urgency')}
        onChange={(e) => setParam('urgency', e.target.value)}
        className={selectClass}
      >
        <option value="">Urgencia: todas</option>
        {(['critical', 'high', 'medium', 'low'] as UrgencyLevel[]).map((u) => (
          <option key={u} value={u}>{URGENCY_CONFIG[u].label}</option>
        ))}
      </select>

      <Sep />

      {/* ── Quick toggles ── */}
      <button
        onClick={() => setParam('overdue', v('overdue') === '1' ? null : '1')}
        className={cn(
          'text-[11px] px-2 py-1 rounded-md border transition-colors',
          v('overdue') === '1'
            ? 'bg-red-500/15 border-red-500/30 text-red-300'
            : 'border-white/10 text-neutral-500 hover:text-neutral-300 hover:border-white/20',
        )}
      >
        ⚠ Vencidas
      </button>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-[11px] text-neutral-600 hover:text-white transition-colors ml-1"
        >
          <X className="w-3 h-3" />
          Limpiar {activeCount > 0 && `(${activeCount})`}
        </button>
      )}
    </div>
  )
}
