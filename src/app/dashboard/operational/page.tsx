import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Clock, TrendingUp, Zap, CheckCircle2, AlertTriangle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { type Task, type UrgencyLevel, tokensToHours, getUrgency, URGENCY_CONFIG, PRIORITY_CONFIG } from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { cn } from '@/lib/utils'
import { AnalyticsTabs } from '@/components/analytics-tabs'

export const metadata = { title: 'Analítica — TaskFlow AI' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function displayName(userId: string, users: UserOption[]): string {
  const u = users.find((x) => x.id === userId)
  return u?.full_name ?? userId.slice(0, 8)
}

function initials(userId: string, users: UserOption[]): string {
  const u = users.find((x) => x.id === userId)
  if (u?.full_name) return u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return userId.slice(0, 2).toUpperCase()
}

const URGENCY_ORDER: Record<UrgencyLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }

// ── UI primitives ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = 'blue', icon }: {
  label: string; value: string | number; sub?: string
  accent?: 'blue' | 'red' | 'violet' | 'green' | 'yellow' | 'orange'
  icon?: React.ReactNode
}) {
  const ring = {
    blue:   'border-blue-500/20 bg-blue-500/5',
    red:    'border-red-500/20 bg-red-500/5',
    violet: 'border-violet-500/20 bg-violet-500/5',
    green:  'border-green-500/20 bg-green-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
    orange: 'border-orange-500/20 bg-orange-500/5',
  }
  const text = {
    blue:   'text-blue-400', red:    'text-red-400',    violet: 'text-violet-400',
    green:  'text-green-400', yellow: 'text-yellow-400', orange: 'text-orange-400',
  }
  return (
    <div className={cn('rounded-lg border p-3', ring[accent])}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className={cn('shrink-0', text[accent])}>{icon}</span>}
        <p className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</p>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', text[accent])}>{value}</p>
      {sub && <p className="text-[10px] text-neutral-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarRow({ label, value, max, color, subLabel }: {
  label: string; value: number; max: number; color: string; subLabel?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-neutral-400 w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-3 rounded bg-white/5 overflow-hidden">
        <div className={cn('h-full rounded transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-neutral-400 w-10 shrink-0 text-right tabular-nums">
        {value}{subLabel ? ` ${subLabel}` : ''}
      </span>
    </div>
  )
}

function DonutChart({ segments }: {
  segments: { label: string; value: number; color: string; textColor: string }[]
}) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (total === 0) return <p className="text-xs text-neutral-600 text-center py-4">Sin datos</p>
  const r = 38; const cx = 52; const cy = 52; const circumference = 2 * Math.PI * r
  let cum = 0
  const arcs = segments.map((seg) => {
    const pct = seg.value / total
    const dash = pct * circumference; const gap = circumference - dash
    const offset = circumference - cum * circumference
    cum += pct
    return { ...seg, dash, gap, offset }
  })
  return (
    <div className="flex items-center gap-4">
      <svg width="104" height="104" viewBox="0 0 104 104" className="shrink-0">
        {arcs.map((arc, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" strokeWidth={12} stroke={arc.color}
            strokeDasharray={`${arc.dash} ${arc.gap}`} strokeDashoffset={arc.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '52px 52px' }} />
        ))}
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" fill="#525252" fontSize="8">tareas</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: seg.color }} />
            <span className="text-[10px] text-neutral-400">{seg.label}</span>
            <span className={cn('text-[10px] font-semibold ml-auto pl-2 tabular-nums', seg.textColor)}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white/[0.03] border border-white/8 rounded-xl p-4', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">{title}</p>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [allTasks, role, users] = await Promise.all([
    getTasks(),
    getCurrentUserRole(),
    getUsers(),
  ])

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('weekly_capacity_tokens')
    .eq('id', user.id)
    .single()

  const myCapacity  = (myProfile?.weekly_capacity_tokens as number) ?? 40
  const isPrivileged = role === 'leader' || role === 'admin_system'
  const now          = new Date()
  const weekStart    = startOfWeek()
  const todayStr     = now.toISOString().split('T')[0]

  // ── Mi carga data ─────────────────────────────────────────────────────────

  const myTasks = allTasks.filter(
    (t) => t.assigned_to === user.id || t.task_owner_id === user.id || t.user_id === user.id,
  )
  const myActive   = myTasks.filter((t) => t.status !== 'done')
  const myIP       = myTasks.filter((t) => t.status === 'in_progress')
  const myDoneWeek = myTasks.filter(
    (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekStart,
  )
  const myOverdue  = myActive.filter((t) => t.due_date && t.due_date < todayStr)

  const myTokensIP       = myIP.reduce((s, t) => s + (t.effort_tokens ?? 0), 0)
  const myTokensDoneWeek = myDoneWeek.reduce((s, t) => s + (t.effort_tokens ?? 0), 0)
  const myCapacityPct    = myCapacity > 0 ? Math.round((myTokensIP / myCapacity) * 100) : 0

  const myUrgency = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of myActive) myUrgency[getUrgency(t)]++

  const myTopUrgent = [...myActive]
    .sort((a, b) =>
      URGENCY_ORDER[getUrgency(a)] - URGENCY_ORDER[getUrgency(b)] ||
      (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
    )
    .slice(0, 6)

  // ── Team data ─────────────────────────────────────────────────────────────

  const activeTasks = allTasks.filter((t) => t.status !== 'done')
  const statusDist  = {
    todo:        allTasks.filter((t) => t.status === 'todo').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    done:        allTasks.filter((t) => t.status === 'done').length,
  }
  const priorityDist = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of activeTasks) priorityDist[t.priority]++
  const maxPriority = Math.max(...Object.values(priorityDist), 1)

  type UserLoad = { userId: string; tokensIP: number; activeTasks: number; capacity: number }
  const loadMap = new Map<string, UserLoad>()
  for (const u of users) {
    loadMap.set(u.id, { userId: u.id, tokensIP: 0, activeTasks: 0, capacity: u.weekly_capacity_tokens })
  }
  for (const t of allTasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!loadMap.has(uid)) loadMap.set(uid, { userId: uid, tokensIP: 0, activeTasks: 0, capacity: 40 })
    const e = loadMap.get(uid)!
    if (t.status !== 'done') {
      e.activeTasks++
      if (t.status === 'in_progress') e.tokensIP += t.effort_tokens ?? 0
    }
  }
  const workload = [...loadMap.values()].sort((a, b) => b.tokensIP - a.tokensIP)

  // ── Risks data ────────────────────────────────────────────────────────────

  const overdueAll = activeTasks
    .filter((t) => t.due_date && t.due_date < todayStr)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  const unassigned = activeTasks.filter((t) => !t.assigned_to)

  const highRisk = activeTasks.filter((t) => {
    if (!t.due_date) return false
    const daysLeft = Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000)
    return daysLeft >= 0 && daysLeft <= 3 && (t.effort_tokens ?? 0) > 8
  })

  // ── Tab content ───────────────────────────────────────────────────────────

  const myLoadSection = (
    <div className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Tareas activas"    value={myActive.length}         accent="blue"   icon={<Zap className="w-3 h-3" />} />
        <KpiCard label="En progreso"       value={myIP.length}             accent="yellow" icon={<Clock className="w-3 h-3" />} />
        <KpiCard label="Completadas/sem"   value={myDoneWeek.length}       accent="green"  icon={<CheckCircle2 className="w-3 h-3" />} />
        <KpiCard label="Vencidas"          value={myOverdue.length}        accent={myOverdue.length > 0 ? 'red' : 'blue'} icon={<AlertCircle className="w-3 h-3" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Capacidad semanal">
          <div className="flex items-center justify-between text-[9px] text-neutral-500 mb-2">
            <span>{myTokensIP} tokens en progreso</span>
            <span>Cap. {myCapacity}t ({tokensToHours(myCapacity).toFixed(0)}h)</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/8 overflow-hidden mb-3">
            <div
              className={cn('h-full rounded-full transition-all duration-700',
                myCapacityPct > 100 ? 'bg-red-500' : myCapacityPct > 70 ? 'bg-yellow-500' : 'bg-blue-500')}
              style={{ width: `${Math.min(myCapacityPct, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-neutral-600">Completados esta semana</p>
              <p className="text-sm font-semibold text-green-400">
                {myTokensDoneWeek}t
                <span className="text-[10px] text-neutral-500 ml-1">({tokensToHours(myTokensDoneWeek).toFixed(1)}h)</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] text-neutral-600">Carga actual</p>
              <p className={cn('text-sm font-semibold', myCapacityPct > 100 ? 'text-red-400' : 'text-neutral-300')}>
                {myCapacityPct}%{myCapacityPct > 100 ? ' ⚠' : ''}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Urgencia de mis tareas">
          <div className="flex flex-col gap-2">
            {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => (
              <BarRow
                key={lvl}
                label={URGENCY_CONFIG[lvl].label}
                value={myUrgency[lvl]}
                max={Math.max(...Object.values(myUrgency), 1)}
                color={lvl === 'critical' ? 'bg-red-600/80' : lvl === 'high' ? 'bg-orange-500/70' : lvl === 'medium' ? 'bg-yellow-500/60' : 'bg-slate-500/50'}
                subLabel="tareas"
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {myTopUrgent.length > 0 && (
        <SectionCard title="Mis tareas más urgentes">
          <div className="flex flex-col">
            {myTopUrgent.map((t) => {
              const urg  = getUrgency(t)
              const uc   = URGENCY_CONFIG[urg]
              const daysLeft = t.due_date
                ? Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000)
                : null
              return (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className={cn('text-[9px] px-1.5 py-px rounded font-semibold shrink-0', uc.className)}>
                    {uc.label}
                  </span>
                  <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                  {daysLeft !== null && (
                    <span className={cn('text-[10px] shrink-0 tabular-nums', daysLeft < 0 ? 'text-red-400' : 'text-neutral-500')}>
                      {daysLeft < 0 ? `+${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <Link
            href={`/dashboard?execution_owner=${user.id}`}
            className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors block"
          >
            Ver todas mis tareas en el board →
          </Link>
        </SectionCard>
      )}
    </div>
  )

  const teamSection = (
    <div className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Distribución por estado">
          <DonutChart segments={[
            { label: 'Por hacer',   value: statusDist.todo,        color: '#3b82f6', textColor: 'text-blue-400'   },
            { label: 'En progreso', value: statusDist.in_progress, color: '#eab308', textColor: 'text-yellow-400' },
            { label: 'Terminado',   value: statusDist.done,        color: '#22c55e', textColor: 'text-green-400'  },
          ]} />
        </SectionCard>

        <SectionCard title="Prioridad (tareas activas)">
          <div className="flex flex-col gap-2">
            <BarRow label="Crítica" value={priorityDist.critical} max={maxPriority} color="bg-red-600/70"    subLabel="tareas" />
            <BarRow label="Alta"    value={priorityDist.high}     max={maxPriority} color="bg-red-400/60"    subLabel="tareas" />
            <BarRow label="Media"   value={priorityDist.medium}   max={maxPriority} color="bg-yellow-400/60" subLabel="tareas" />
            <BarRow label="Baja"    value={priorityDist.low}      max={maxPriority} color="bg-green-400/60"  subLabel="tareas" />
          </div>
        </SectionCard>
      </div>

      {workload.length > 0 && (
        <SectionCard title="Carga por persona">
          <div className="flex flex-col gap-2">
            {workload.map((w) => {
              const pct   = w.capacity > 0 ? Math.round((w.tokensIP / w.capacity) * 100) : 0
              const isOver = pct > 100
              return (
                <div key={w.userId} className="grid grid-cols-[130px_1fr_48px_72px] items-center gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                      {initials(w.userId, users)}
                    </div>
                    <span className="text-[11px] text-neutral-300 truncate">{displayName(w.userId, users)}</span>
                  </div>
                  <div className="h-3 rounded bg-white/5 overflow-hidden">
                    <div
                      className={cn('h-full rounded transition-all duration-500', isOver ? 'bg-red-500/70' : 'bg-blue-500/60')}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={cn('text-[10px] tabular-nums text-right font-semibold', isOver ? 'text-red-400' : 'text-neutral-500')}>
                    {pct}%{isOver ? ' ⚠' : ''}
                  </span>
                  <span className="text-[9px] text-neutral-600 text-right">{w.activeTasks} tareas</span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )

  const risksSection = (
    <div className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Vencidas" value={overdueAll.length} accent={overdueAll.length > 0 ? 'red' : 'blue'} icon={<AlertCircle className="w-3 h-3" />} />
        <KpiCard label="Sin responsable" value={unassigned.length} accent={unassigned.length > 0 ? 'orange' : 'blue'} icon={<User className="w-3 h-3" />} />
        <KpiCard label="Riesgo de entrega" value={highRisk.length} accent={highRisk.length > 0 ? 'yellow' : 'blue'} sub="alto esfuerzo ≤3d" icon={<AlertTriangle className="w-3 h-3" />} />
      </div>

      {overdueAll.length > 0 && (
        <SectionCard title={`Tareas vencidas (${overdueAll.length})`}>
          <div className="flex flex-col">
            {overdueAll.slice(0, 8).map((t) => {
              const daysLate = Math.round((now.getTime() - new Date(t.due_date!).getTime()) / 86_400_000)
              return (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-[9px] px-1 py-px rounded bg-red-500/20 text-red-400 shrink-0 tabular-nums">+{daysLate}d</span>
                  <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                  <span className="text-[10px] text-neutral-500 shrink-0">{displayName(t.assigned_to ?? t.user_id, users)}</span>
                  <Link href={`/dashboard?execution_owner=${t.assigned_to ?? t.user_id}&overdue=1`} className="text-[10px] text-blue-400 hover:text-blue-300 shrink-0">Ver →</Link>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {unassigned.length > 0 && (
        <SectionCard title={`Sin responsable de ejecución (${unassigned.length})`}>
          <div className="flex flex-col">
            {unassigned.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                <span className={cn('text-[9px] px-1 py-px rounded font-semibold shrink-0', PRIORITY_CONFIG[t.priority].className)}>
                  {PRIORITY_CONFIG[t.priority].label}
                </span>
                <span className="text-xs text-white flex-1 truncate">{t.title}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard" className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 block">
            Asignar en el board →
          </Link>
        </SectionCard>
      )}

      {highRisk.length > 0 && (
        <SectionCard title={`Alto esfuerzo con plazo inminente (${highRisk.length})`}>
          <div className="flex flex-col">
            {highRisk.map((t) => {
              const daysLeft = Math.round((new Date(t.due_date!).getTime() - now.getTime()) / 86_400_000)
              return (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-[9px] px-1 py-px rounded bg-yellow-500/20 text-yellow-400 shrink-0">{daysLeft}d</span>
                  <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                  <span className="text-[10px] text-neutral-500 shrink-0">{t.effort_tokens}t</span>
                  <span className="text-[10px] text-neutral-500 shrink-0">{displayName(t.assigned_to ?? t.user_id, users)}</span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {overdueAll.length === 0 && unassigned.length === 0 && highRisk.length === 0 && (
        <div className="flex items-center justify-center py-12 text-neutral-600 text-sm">
          ✓ Sin riesgos identificados
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-screen">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-neutral-300">Analítica</h1>
          {!isPrivileged && <span className="text-[10px] text-neutral-600">Vista personal</span>}
        </div>
        <p className="text-[10px] text-neutral-600">{allTasks.length} tareas totales</p>
      </header>

      <AnalyticsTabs
        isPrivileged={isPrivileged}
        myLoad={myLoadSection}
        team={teamSection}
        risks={risksSection}
      />
    </div>
  )
}
