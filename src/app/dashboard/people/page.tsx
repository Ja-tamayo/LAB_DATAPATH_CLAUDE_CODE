import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers, type UserOption } from '@/actions/users'
import { tokensToHours, getUrgency } from '@/types/tasks'
import { RoleSelect } from '@/components/role-select'
import { CreateUserForm } from '@/components/create-user-form'
import { ResetPasswordControl } from '@/components/reset-password-control'
import { CapacityInput } from '@/components/capacity-input'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Personas - TaskFlow AI' }

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const [datePart] = dateStr.split('T')
  const parts = datePart.split('-').map(Number)
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  const parsed = new Date(dateStr)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function inPeriod(dateStr: string | null | undefined, start: Date, end: Date): boolean {
  const date = parseLocalDate(dateStr)
  return !!date && date >= start && date <= end
}

type UserStats = {
  user: UserOption
  activeTasks: number
  tokensAssigned: number
  tokensInProgress: number
  tokensCompletedTotal: number
  capacity: number
  overdueTasks: number
  urgentTasks: number
}

export default async function PeoplePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tasks, role, users] = await Promise.all([
    getTasks(),
    getCurrentUserRole(),
    getUsers(),
  ])

  if (role === 'collaborator') redirect('/dashboard/operational')

  const isAdmin = role === 'admin_system'
  const now = new Date()
  const todayStr = toDateKey(now)
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  const statsMap = new Map<string, UserStats>()
  for (const u of users) {
    statsMap.set(u.id, {
      user: u,
      activeTasks: 0,
      tokensAssigned: 0,
      tokensInProgress: 0,
      tokensCompletedTotal: 0,
      capacity: u.weekly_capacity_tokens,
      overdueTasks: 0,
      urgentTasks: 0,
    })
  }

  for (const t of tasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!statsMap.has(uid)) {
      statsMap.set(uid, {
        user: { id: uid, email: '', full_name: null, role: 'collaborator', weekly_capacity_tokens: 40 },
        activeTasks: 0,
        tokensAssigned: 0,
        tokensInProgress: 0,
        tokensCompletedTotal: 0,
        capacity: 40,
        overdueTasks: 0,
        urgentTasks: 0,
      })
    }

    const s = statsMap.get(uid)!
    const isActiveThisWeek = t.status !== 'done' && inPeriod(t.estimated_start_date, weekStart, weekEnd)
    const isDoneThisWeek = t.status === 'done' && inPeriod(t.completed_at, weekStart, weekEnd)

    if (isActiveThisWeek) {
      s.activeTasks++
      s.tokensAssigned += t.effort_tokens ?? 0
      if (t.status === 'in_progress') s.tokensInProgress += t.effort_tokens ?? 0
      if (t.due_date && t.due_date < todayStr) s.overdueTasks++
      const urg = getUrgency(t)
      if (urg === 'critical' || urg === 'high') s.urgentTasks++
    } else if (isDoneThisWeek) {
      s.tokensCompletedTotal += t.effort_tokens ?? 0
    }
  }

  const stats = [...statsMap.values()].sort((a, b) => b.activeTasks - a.activeTasks)

  function initials(u: UserOption): string {
    if (u.full_name) return u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    return u.id.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="shrink-0 border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-medium text-neutral-300">Personas &amp; Equipo</h1>
            {isAdmin && <p className="text-[10px] text-neutral-600">Capacidad semanal y carga prevista de esta semana</p>}
          </div>
          <p className="text-[10px] text-neutral-600">{users.length} miembro{users.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      <main className="w-full flex-1 p-4">
        {isAdmin && <CreateUserForm />}

        {stats.length === 0 ? (
          <p className="mt-8 text-center text-xs text-neutral-600">No hay miembros del equipo aun.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 2xl:hidden">
              {stats.map((s) => {
                const loadPct = s.capacity > 0 ? Math.round((s.tokensAssigned / s.capacity) * 100) : 0
                const isOver = loadPct > 100
                const isSelf = s.user.id === user.id

                return (
                  <div key={s.user.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-xs font-bold text-white">
                          {initials(s.user)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {s.user.full_name ?? s.user.id.slice(0, 8)}
                            {isSelf && <span className="ml-1 text-[9px] text-neutral-600">(yo)</span>}
                          </p>
                          {isAdmin ? (
                            <RoleSelect userId={s.user.id} currentRole={s.user.role} isSelf={isSelf} />
                          ) : (
                            <span className={cn('rounded px-1 py-0.5 text-[9px] font-semibold', s.user.role === 'admin_system' ? 'bg-violet-500/20 text-violet-400' : s.user.role === 'leader' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400')}>
                              {s.user.role === 'admin_system' ? 'Admin' : s.user.role === 'leader' ? 'Lider' : 'Colaborador'}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-600">{s.capacity}t/sem</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="Activas" value={s.activeTasks} />
                      <Metric label="Planificado" value={`${s.tokensAssigned}t`} sub={`${tokensToHours(s.tokensAssigned).toFixed(1)}h`} />
                      <Metric label="Cerrado" value={`${s.tokensCompletedTotal}t`} sub={`${tokensToHours(s.tokensCompletedTotal).toFixed(1)}h`} accent="green" />
                      <Metric label="Carga" value={`${loadPct}%`} sub={`${tokensToHours(s.tokensAssigned).toFixed(1)}h / ${tokensToHours(s.capacity).toFixed(1)}h`} accent={isOver ? 'red' : loadPct > 70 ? 'yellow' : 'white'} />
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                        <div
                          className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : loadPct > 70 ? 'bg-yellow-500' : 'bg-blue-500')}
                          style={{ width: `${Math.min(loadPct, 100)}%` }}
                        />
                      </div>
                      <span className={cn('w-10 text-right text-[11px] font-medium tabular-nums', isOver ? 'text-red-400' : loadPct > 70 ? 'text-yellow-400' : 'text-neutral-400')}>
                        {loadPct}%
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {s.overdueTasks > 0 && (
                        <span className="rounded border border-red-500/15 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                          {s.overdueTasks} vencida{s.overdueTasks !== 1 ? 's' : ''}
                        </span>
                      )}
                      {s.urgentTasks > 0 && (
                        <span className="rounded border border-orange-500/15 bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300">
                          {s.urgentTasks} urgente{s.urgentTasks !== 1 ? 's' : ''}
                        </span>
                      )}
                      {s.overdueTasks === 0 && s.urgentTasks === 0 && (
                        <span className="text-[10px] text-neutral-700">Sin alertas</span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                        <CapacityInput userId={s.user.id} value={s.capacity} />
                        <ResetPasswordControl userId={s.user.id} disabled={isSelf} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto pb-1 2xl:block">
              <div className="min-w-[1180px]">
                <div className="mb-2 grid grid-cols-[minmax(220px,1.2fr)_72px_120px_120px_140px_minmax(220px,1fr)_240px] gap-4 px-5 text-[10px] uppercase tracking-wider text-neutral-600">
                  <span>Miembro</span>
                  <span className="text-right">Activas</span>
                  <span className="text-right">Planificado</span>
                  <span className="text-right">Cerrado</span>
                  <span className="text-right">Riesgos</span>
                  <span>Carga semanal</span>
                  <span>Acceso</span>
                </div>

                <div className="flex flex-col gap-2">
                  {stats.map((s) => {
                    const loadPct = s.capacity > 0 ? Math.round((s.tokensAssigned / s.capacity) * 100) : 0
                    const isOver = loadPct > 100
                    const isSelf = s.user.id === user.id

                    return (
                      <div
                        key={s.user.id}
                        className="grid grid-cols-[minmax(220px,1.2fr)_72px_120px_120px_140px_minmax(220px,1fr)_240px] items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-xs font-bold text-white">
                            {initials(s.user)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-white">
                              {s.user.full_name ?? s.user.id.slice(0, 8)}
                              {isSelf && <span className="ml-1 text-[9px] text-neutral-600">(yo)</span>}
                            </p>
                            {isAdmin ? (
                              <RoleSelect userId={s.user.id} currentRole={s.user.role} isSelf={isSelf} />
                            ) : (
                              <span className={cn('rounded px-1 py-0.5 text-[9px] font-semibold', s.user.role === 'admin_system' ? 'bg-violet-500/20 text-violet-400' : s.user.role === 'leader' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400')}>
                                {s.user.role === 'admin_system' ? 'Admin' : s.user.role === 'leader' ? 'Lider' : 'Colaborador'}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-right text-sm font-semibold text-white">{s.activeTasks}</p>
                        <p className="text-right text-sm font-semibold text-white">
                          {s.tokensAssigned}
                          <span className="ml-1 text-[10px] text-neutral-600">({tokensToHours(s.tokensAssigned).toFixed(1)}h)</span>
                        </p>
                        <p className="text-right text-sm font-semibold text-green-400">
                          {s.tokensCompletedTotal}
                          <span className="ml-1 text-[10px] text-neutral-600">({tokensToHours(s.tokensCompletedTotal).toFixed(1)}h)</span>
                        </p>

                        <div className="flex flex-col items-end gap-1">
                          {s.overdueTasks > 0 && (
                            <span className="rounded border border-red-500/15 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                              {s.overdueTasks} vencida{s.overdueTasks !== 1 ? 's' : ''}
                            </span>
                          )}
                          {s.urgentTasks > 0 && (
                            <span className="rounded border border-orange-500/15 bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300">
                              {s.urgentTasks} urgente{s.urgentTasks !== 1 ? 's' : ''}
                            </span>
                          )}
                          {s.overdueTasks === 0 && s.urgentTasks === 0 && (
                            <span className="text-[10px] text-neutral-700">Sin alertas</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                            <div
                              className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : loadPct > 70 ? 'bg-yellow-500' : 'bg-blue-500')}
                              style={{ width: `${Math.min(loadPct, 100)}%` }}
                            />
                          </div>
                          <div className="w-24 shrink-0 text-right">
                            <p className={cn('text-[11px] font-medium tabular-nums', isOver ? 'text-red-400' : loadPct > 70 ? 'text-yellow-400' : 'text-neutral-400')}>
                              {loadPct}%
                            </p>
                            <p className="text-[9px] text-neutral-700">
                              {tokensToHours(s.tokensAssigned).toFixed(1)}h / {tokensToHours(s.capacity).toFixed(1)}h
                            </p>
                          </div>
                        </div>

                        {isAdmin ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <CapacityInput userId={s.user.id} value={s.capacity} />
                            <ResetPasswordControl userId={s.user.id} disabled={isSelf} />
                          </div>
                        ) : (
                          <span className="text-[9px] text-neutral-700">-</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Metric({ label, value, sub, accent = 'white' }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'white' | 'green' | 'yellow' | 'red'
}) {
  const colors = {
    white: 'text-white',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', colors[accent])}>{value}</p>
      {sub && <p className="text-[10px] text-neutral-600">{sub}</p>}
    </div>
  )
}
