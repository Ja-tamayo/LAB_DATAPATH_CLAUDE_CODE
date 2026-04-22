import { redirect } from 'next/navigation'
import { AlertCircle, Clock, TrendingUp, Zap, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { type Task, tokensToHours, getUrgency, URGENCY_CONFIG, PRIORITY_CONFIG, IMPACT_CONFIG } from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Analítica — TaskFlow AI' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
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

// ── UI primitives ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-4">
      {children}
    </h2>
  )
}

function KpiCard({
  label, value, sub, accent = 'blue', icon,
}: {
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
    blue:   'text-blue-400',
    red:    'text-red-400',
    violet: 'text-violet-400',
    green:  'text-green-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
  }
  return (
    <div className={cn('rounded-xl border p-4', ring[accent])}>
      <div className="flex items-start gap-2 mb-2">
        {icon && <span className={cn('mt-0.5', text[accent])}>{icon}</span>}
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      </div>
      <p className={cn('text-3xl font-bold', text[accent])}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-600 mt-1">{sub}</p>}
    </div>
  )
}

// Horizontal bar row inside a BarChart
function BarRow({
  label, value, max, color, subLabel,
}: {
  label: string; value: number; max: number; color: string; subLabel?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-neutral-400 w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-4 rounded-md bg-white/5 overflow-hidden relative">
        <div
          className={cn('h-full rounded-md transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-neutral-300 w-14 shrink-0 text-right tabular-nums">
        {value}{subLabel ? ` ${subLabel}` : ''}
      </span>
    </div>
  )
}

// Donut-style ring chart (pure CSS + SVG)
function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string; textColor: string }[]
}) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (total === 0) return <p className="text-xs text-neutral-600 text-center py-4">Sin datos</p>

  const size = 120
  const r = 44
  const cx = 60
  const cy = 60
  const circumference = 2 * Math.PI * r

  let cumulativePct = 0
  const arcs = segments.map((seg) => {
    const pct = seg.value / total
    const dash = pct * circumference
    const gap  = circumference - dash
    const offset = circumference - cumulativePct * circumference
    cumulativePct += pct
    return { ...seg, dash, gap, offset }
  })

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            strokeWidth={14}
            stroke={arc.color}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.offset}
            className="transition-all duration-500"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
          />
        ))}
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="fill-white text-sm font-bold" fontSize="18">
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" className="fill-neutral-500" fontSize="9">
          tareas
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: seg.color }} />
            <span className="text-[11px] text-neutral-400">{seg.label}</span>
            <span className={cn('text-[11px] font-semibold ml-auto pl-3 tabular-nums', seg.textColor)}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
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

  const now       = new Date()
  const weekStart = startOfWeek()
  const isLeaderOrAdmin = role === 'leader' || role === 'admin_system'

  const tasks: Task[] = isLeaderOrAdmin
    ? allTasks
    : allTasks.filter(
        (t) => t.assigned_to === user.id || t.task_owner_id === user.id || t.user_id === user.id,
      )

  // ── KPI counts ────────────────────────────────────────────────────────────
  const byStatus = {
    todo:        tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done:        tasks.filter((t) => t.status === 'done').length,
  }

  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < now,
  )

  const tokensAssignedWeek  = tasks.filter((t) => new Date(t.created_at) >= weekStart).reduce((s, t) => s + (t.effort_tokens ?? 0), 0)
  const tokensCompletedWeek = tasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekStart).reduce((s, t) => s + (t.effort_tokens ?? 0), 0)
  const weeklyLoadPct = tokensAssignedWeek > 0 ? Math.round((tokensCompletedWeek / tokensAssignedWeek) * 100) : 0

  const cycleTimes = tasks.map((t) => daysBetween(t.started_at, t.completed_at)).filter((v): v is number => v !== null && v >= 0)
  const avgCycle = cycleTimes.length > 0 ? (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) : null

  const leadTimes = tasks.filter((t) => t.status === 'done' && t.completed_at).map((t) => daysBetween(t.created_at, t.completed_at)).filter((v): v is number => v !== null && v >= 0)
  const avgLead = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null

  // ── Distributions ─────────────────────────────────────────────────────────
  const activeTasks = tasks.filter((t) => t.status !== 'done')

  const urgencyDist  = { critical: 0, high: 0, medium: 0, low: 0 }
  const priorityDist = { critical: 0, high: 0, medium: 0, low: 0 }
  const impactDist   = { critical: 0, high: 0, medium: 0, low: 0 }

  for (const t of activeTasks) {
    urgencyDist[getUrgency(t)]++
    priorityDist[t.priority]++
    if (t.impact_level) impactDist[t.impact_level]++
  }

  const maxDist = Math.max(...Object.values(urgencyDist), ...Object.values(priorityDist), 1)

  // ── Workload per user ─────────────────────────────────────────────────────
  type UserLoad = {
    userId: string
    todo: number; inProgress: number; done: number
    tokensAssigned: number; tokensInProgress: number; tokensCompleted: number
    capacity: number
  }

  const loadMap = new Map<string, UserLoad>()
  for (const t of tasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!loadMap.has(uid)) {
      const u = users.find((x) => x.id === uid)
      loadMap.set(uid, { userId: uid, todo: 0, inProgress: 0, done: 0, tokensAssigned: 0, tokensInProgress: 0, tokensCompleted: 0, capacity: u?.weekly_capacity_tokens ?? 40 })
    }
    const e = loadMap.get(uid)!
    e.tokensAssigned += t.effort_tokens ?? 0
    if (t.status === 'done')        { e.done++;        e.tokensCompleted  += t.effort_tokens ?? 0 }
    else if (t.status === 'in_progress') { e.inProgress++; e.tokensInProgress += t.effort_tokens ?? 0 }
    else                            { e.todo++ }
  }

  const workload = [...loadMap.values()].sort((a, b) => b.tokensInProgress - a.tokensInProgress)
  const maxTokens = workload.reduce((m, w) => Math.max(m, w.tokensAssigned), 1)

  // ── Impact vs Effort ──────────────────────────────────────────────────────
  const impactEffort = {
    highLow:  tasks.filter(t => (t.impact_level === 'high' || t.impact_level === 'critical') && (t.effort_tokens ?? 999) <= 4).length,
    highHigh: tasks.filter(t => (t.impact_level === 'high' || t.impact_level === 'critical') && (t.effort_tokens ?? 0)   >  4).length,
    lowLow:   tasks.filter(t => (t.impact_level === 'low'  || t.impact_level === 'medium')   && (t.effort_tokens ?? 999) <= 4).length,
    lowHigh:  tasks.filter(t => (t.impact_level === 'low'  || t.impact_level === 'medium')   && (t.effort_tokens ?? 0)   >  4).length,
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <div>
          <h1 className="text-sm font-medium text-neutral-300">Analítica</h1>
          {!isLeaderOrAdmin && (
            <p className="text-[10px] text-neutral-600">Vista personal</p>
          )}
        </div>
        <p className="text-[10px] text-neutral-600">{tasks.length} tareas totales</p>
      </header>

      <main className="flex-1 p-5 space-y-8 max-w-5xl mx-auto w-full">

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Resumen general</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Por hacer"   value={byStatus.todo}        accent="blue"   icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <KpiCard label="En progreso" value={byStatus.in_progress} accent="yellow" icon={<Zap className="w-3.5 h-3.5" />} />
            <KpiCard label="Terminadas"  value={byStatus.done}        accent="green"  icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <KpiCard label="Vencidas"    value={overdue.length}       accent="red"    icon={<AlertCircle className="w-3.5 h-3.5" />} />
          </div>
        </section>

        {/* ── Estado + Prioridad ─────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Status donut */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <SectionTitle>Distribución por estado</SectionTitle>
            <DonutChart segments={[
              { label: 'Por hacer',   value: byStatus.todo,        color: '#3b82f6', textColor: 'text-blue-400'   },
              { label: 'En progreso', value: byStatus.in_progress, color: '#eab308', textColor: 'text-yellow-400' },
              { label: 'Terminado',   value: byStatus.done,        color: '#22c55e', textColor: 'text-green-400'  },
            ]} />
          </div>

          {/* Priority bars */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <SectionTitle>Distribución por prioridad (activas)</SectionTitle>
            <div className="flex flex-col gap-2.5">
              <BarRow label="Crítica" value={priorityDist.critical} max={maxDist} color="bg-red-600/70"    subLabel="tareas" />
              <BarRow label="Alta"    value={priorityDist.high}     max={maxDist} color="bg-red-400/60"    subLabel="tareas" />
              <BarRow label="Media"   value={priorityDist.medium}   max={maxDist} color="bg-yellow-400/60" subLabel="tareas" />
              <BarRow label="Baja"    value={priorityDist.low}      max={maxDist} color="bg-green-400/60"  subLabel="tareas" />
            </div>
          </div>
        </section>

        {/* ── Urgencia ──────────────────────────────────────────────────── */}
        <section>
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <SectionTitle>Urgencia calculada (tareas activas)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2.5">
                <BarRow label="Vencida"  value={urgencyDist.critical} max={maxDist} color="bg-red-600/80"    subLabel="tareas" />
                <BarRow label="Urgente"  value={urgencyDist.high}     max={maxDist} color="bg-orange-500/70" subLabel="tareas" />
                <BarRow label="Media"    value={urgencyDist.medium}   max={maxDist} color="bg-yellow-500/60" subLabel="tareas" />
                <BarRow label="Baja"     value={urgencyDist.low}      max={maxDist} color="bg-slate-500/50"  subLabel="tareas" />
              </div>
              <div className="flex flex-col gap-1.5 pl-4 border-l border-white/5">
                {urgencyDist.critical > 0 && (
                  <p className="text-xs text-red-400">⚠ {urgencyDist.critical} tarea{urgencyDist.critical !== 1 ? 's' : ''} vencida{urgencyDist.critical !== 1 ? 's' : ''} — acción inmediata</p>
                )}
                {urgencyDist.high > 0 && (
                  <p className="text-xs text-orange-400">⚡ {urgencyDist.high} tarea{urgencyDist.high !== 1 ? 's' : ''} urgente{urgencyDist.high !== 1 ? 's' : ''} — priorizar hoy</p>
                )}
                {urgencyDist.critical === 0 && urgencyDist.high === 0 && (
                  <p className="text-xs text-green-400">✓ Sin alertas de urgencia</p>
                )}
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-neutral-600">Ciclo promedio</p>
                  <p className="text-sm font-semibold text-white">{avgCycle !== null ? `${avgCycle.toFixed(1)} días` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-600">Lead time promedio</p>
                  <p className="text-sm font-semibold text-white">{avgLead !== null ? `${avgLead.toFixed(1)} días` : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tokens esta semana ─────────────────────────────────────────── */}
        <section>
          <SectionTitle>Tokens esta semana</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard label="Asignados esta semana"   value={tokensAssignedWeek}   sub={`≈ ${tokensToHours(tokensAssignedWeek).toFixed(1)}h`}   accent="blue"  icon={<Clock className="w-3.5 h-3.5" />} />
            <KpiCard label="Completados esta semana" value={tokensCompletedWeek}  sub={`≈ ${tokensToHours(tokensCompletedWeek).toFixed(1)}h`}  accent="green" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <KpiCard
              label="% completado / asignado"
              value={`${weeklyLoadPct}%`}
              sub={weeklyLoadPct >= 70 ? 'Buen ritmo' : weeklyLoadPct >= 40 ? 'Ritmo moderado' : 'Ritmo bajo'}
              accent={weeklyLoadPct >= 70 ? 'green' : weeklyLoadPct >= 40 ? 'yellow' : 'orange'}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
          </div>
          {/* Weekly progress bar */}
          <div className="mt-3 bg-white/4 border border-white/8 rounded-xl p-4">
            <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-2">
              <span>Progreso semanal</span>
              <span>{tokensCompletedWeek} / {tokensAssignedWeek} tokens</span>
            </div>
            <div className="h-3 rounded-full bg-white/8 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', weeklyLoadPct >= 70 ? 'bg-green-500' : weeklyLoadPct >= 40 ? 'bg-yellow-500' : 'bg-orange-500')}
                style={{ width: `${Math.min(weeklyLoadPct, 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* ── Carga por usuario — solo leader/admin ─────────────────────── */}
        {isLeaderOrAdmin && workload.length > 0 && (
          <section>
            <SectionTitle>Carga por usuario</SectionTitle>
            <div className="bg-white/4 border border-white/8 rounded-xl p-4 flex flex-col gap-3">
              {workload.map((w) => {
                const loadPct    = Math.min(100, Math.round((w.tokensInProgress / w.capacity) * 100))
                const isOverload = w.tokensInProgress > w.capacity
                return (
                  <div key={w.userId} className="grid grid-cols-[140px_1fr_80px_100px] items-center gap-3">
                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {initials(w.userId, users)}
                      </div>
                      <span className="text-xs text-neutral-300 truncate">{displayName(w.userId, users)}</span>
                    </div>
                    {/* Bar */}
                    <div className="relative h-5 rounded-md bg-white/5 overflow-hidden">
                      <div
                        className={cn('h-full rounded-md transition-all duration-500', isOverload ? 'bg-red-500/70' : 'bg-blue-500/60')}
                        style={{ width: `${loadPct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-[10px] text-neutral-300 font-medium">
                          {w.tokensInProgress} tokens en progreso
                        </span>
                      </div>
                    </div>
                    {/* % */}
                    <span className={cn('text-xs tabular-nums text-right font-semibold', isOverload ? 'text-red-400' : 'text-neutral-400')}>
                      {loadPct}%{isOverload && ' ⚠'}
                    </span>
                    {/* Capacity */}
                    <span className="text-[10px] text-neutral-600 text-right">
                      cap. {w.capacity}t / {tokensToHours(w.capacity).toFixed(0)}h
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Impacto vs Esfuerzo ────────────────────────────────────────── */}
        <section>
          <SectionTitle>Matriz impacto vs esfuerzo</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {/* High impact, Low effort */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[40px] font-black text-green-500/10 leading-none">{impactEffort.highLow}</div>
              <p className="text-[10px] uppercase tracking-wider text-green-400 mb-1">Alto impacto · Bajo esfuerzo</p>
              <p className="text-4xl font-bold text-white mb-1">{impactEffort.highLow}</p>
              <p className="text-[11px] text-green-400/70">🎯 Quick wins — priorizar ahora</p>
            </div>
            {/* High impact, High effort */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[40px] font-black text-violet-500/10 leading-none">{impactEffort.highHigh}</div>
              <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Alto impacto · Alto esfuerzo</p>
              <p className="text-4xl font-bold text-white mb-1">{impactEffort.highHigh}</p>
              <p className="text-[11px] text-violet-400/70">📋 Estratégicas — planificar sprint</p>
            </div>
            {/* Low impact, Low effort */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[40px] font-black text-white/5 leading-none">{impactEffort.lowLow}</div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Bajo impacto · Bajo esfuerzo</p>
              <p className="text-4xl font-bold text-white mb-1">{impactEffort.lowLow}</p>
              <p className="text-[11px] text-neutral-600">⏸ Relleno — cuando haya tiempo</p>
            </div>
            {/* Low impact, High effort */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[40px] font-black text-red-500/10 leading-none">{impactEffort.lowHigh}</div>
              <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Bajo impacto · Alto esfuerzo</p>
              <p className="text-4xl font-bold text-white mb-1">{impactEffort.lowHigh}</p>
              <p className="text-[11px] text-red-400/70">🚫 Evitar — costo-beneficio negativo</p>
            </div>
          </div>
        </section>

        {/* ── Tareas vencidas ─────────────────────────────────────────────── */}
        {overdue.length > 0 && (
          <section>
            <SectionTitle>Tareas vencidas ({overdue.length})</SectionTitle>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-red-500/10 text-red-400/60 text-left">
                    <th className="px-4 py-2.5 font-medium">Tarea</th>
                    {isLeaderOrAdmin && <th className="px-3 py-2.5 font-medium">Responsable</th>}
                    <th className="px-4 py-2.5 font-medium text-right">Fecha límite</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue
                    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                    .map((t) => {
                      const daysLate = Math.round((now.getTime() - new Date(t.due_date!).getTime()) / 86_400_000)
                      return (
                        <tr key={t.id} className="border-b border-red-500/10 last:border-0">
                          <td className="px-4 py-3 text-white max-w-[220px] truncate">{t.title}</td>
                          {isLeaderOrAdmin && (
                            <td className="px-3 py-3 text-neutral-400">{displayName(t.assigned_to ?? t.user_id, users)}</td>
                          )}
                          <td className="px-4 py-3 text-right text-red-400">
                            {new Date(t.due_date!).toLocaleDateString('es')}
                            <span className="ml-2 text-red-500/50 text-[10px]">+{daysLate}d</span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
