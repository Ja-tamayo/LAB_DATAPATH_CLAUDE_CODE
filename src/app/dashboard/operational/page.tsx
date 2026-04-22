import { redirect } from 'next/navigation'
import { AlertCircle, Clock, TrendingUp, Zap, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { type Task, type UserRole, tokensToHours, getUrgency, URGENCY_CONFIG, PRIORITY_CONFIG } from '@/types/tasks'
import { type UserOption } from '@/actions/users'

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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent = 'blue',
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string
  accent?: 'blue' | 'red' | 'violet' | 'green' | 'yellow'
}) {
  const colors = {
    blue:   'bg-blue-500/10 text-blue-400',
    red:    'bg-red-500/10 text-red-400',
    violet: 'bg-violet-500/10 text-violet-400',
    green:  'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[accent]}`}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-[11px] text-neutral-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">{children}</h2>
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

  const now      = new Date()
  const weekStart = startOfWeek()
  const isLeaderOrAdmin = role === 'leader' || role === 'admin_system'

  // Collaborator: scope to own tasks
  const tasks: Task[] = isLeaderOrAdmin
    ? allTasks
    : allTasks.filter(
        (t) => t.assigned_to === user.id || t.task_owner_id === user.id || t.user_id === user.id,
      )

  // ── Status counts ─────────────────────────────────────────────────────────
  const byStatus = {
    todo:        tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done:        tasks.filter((t) => t.status === 'done').length,
  }

  // ── Overdue ───────────────────────────────────────────────────────────────
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < now,
  )

  // ── Tokens this week ──────────────────────────────────────────────────────
  const tokensAssignedWeek = tasks
    .filter((t) => new Date(t.created_at) >= weekStart)
    .reduce((s, t) => s + (t.effort_tokens ?? 0), 0)

  const tokensCompletedWeek = tasks
    .filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekStart)
    .reduce((s, t) => s + (t.effort_tokens ?? 0), 0)

  const weeklyLoadPct = tokensAssignedWeek > 0
    ? Math.round((tokensCompletedWeek / tokensAssignedWeek) * 100)
    : 0

  // ── Cycle + Lead time ─────────────────────────────────────────────────────
  const cycleTimes = tasks
    .map((t) => daysBetween(t.started_at, t.completed_at))
    .filter((v): v is number => v !== null && v >= 0)

  const avgCycle = cycleTimes.length > 0
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
    : null

  const leadTimes = tasks
    .filter((t) => t.status === 'done' && t.completed_at)
    .map((t) => daysBetween(t.created_at, t.completed_at))
    .filter((v): v is number => v !== null && v >= 0)

  const avgLead = leadTimes.length > 0
    ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
    : null

  // ── Urgency distribution ──────────────────────────────────────────────────
  const urgencyDist = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of tasks.filter((t) => t.status !== 'done')) {
    urgencyDist[getUrgency(t)]++
  }

  // ── Priority distribution ─────────────────────────────────────────────────
  const priorityDist = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of tasks.filter((t) => t.status !== 'done')) {
    priorityDist[t.priority]++
  }

  // ── Workload by user ──────────────────────────────────────────────────────
  type UserLoad = {
    userId: string
    todo: number; inProgress: number; done: number
    tokens: number; tokensCompleted: number; tokensInProgress: number
    capacity: number
  }

  const loadMap = new Map<string, UserLoad>()
  for (const t of tasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!loadMap.has(uid)) {
      const u = users.find((x) => x.id === uid)
      loadMap.set(uid, {
        userId: uid,
        todo: 0, inProgress: 0, done: 0,
        tokens: 0, tokensCompleted: 0, tokensInProgress: 0,
        capacity: u?.weekly_capacity_tokens ?? 40,
      })
    }
    const entry = loadMap.get(uid)!
    entry.tokens += t.effort_tokens ?? 0
    if (t.status === 'done')        { entry.done++;        entry.tokensCompleted  += t.effort_tokens ?? 0 }
    else if (t.status === 'in_progress') { entry.inProgress++; entry.tokensInProgress += t.effort_tokens ?? 0 }
    else                            { entry.todo++ }
  }

  const workload = [...loadMap.values()].sort((a, b) => b.tokensInProgress - a.tokensInProgress)

  // ── Impact vs Effort matrix ───────────────────────────────────────────────
  const impactEffort = {
    highImpactLowEffort:  tasks.filter(t => (t.impact_level === 'high' || t.impact_level === 'critical') && (t.effort_tokens ?? 999) <= 4).length,
    highImpactHighEffort: tasks.filter(t => (t.impact_level === 'high' || t.impact_level === 'critical') && (t.effort_tokens ?? 0) > 4).length,
    lowImpactLowEffort:   tasks.filter(t => (t.impact_level === 'low'  || t.impact_level === 'medium')   && (t.effort_tokens ?? 999) <= 4).length,
    lowImpactHighEffort:  tasks.filter(t => (t.impact_level === 'low'  || t.impact_level === 'medium')   && (t.effort_tokens ?? 0) > 4).length,
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <div>
          <h1 className="text-sm font-medium text-neutral-300">Analítica</h1>
          {!isLeaderOrAdmin && (
            <p className="text-[10px] text-neutral-600">Vista personal — solo tus tareas</p>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-7 max-w-5xl mx-auto w-full">

        {/* Resumen */}
        <section>
          <SectionTitle>Resumen</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Por hacer"    value={byStatus.todo}        accent="blue"   />
            <StatCard icon={<Zap className="w-4 h-4" />}        label="En progreso"  value={byStatus.in_progress} accent="yellow" />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Terminadas"   value={byStatus.done}        accent="green"  />
            <StatCard icon={<AlertCircle className="w-4 h-4" />} label="Vencidas"    value={overdue.length}       accent="red"    />
          </div>
        </section>

        {/* Tokens esta semana */}
        <section>
          <SectionTitle>Tokens esta semana</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={<Clock className="w-4 h-4" />} label="Tokens asignados"   value={tokensAssignedWeek}   sub={`≈ ${tokensToHours(tokensAssignedWeek).toFixed(1)}h`}   accent="blue"  />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Tokens completados" value={tokensCompletedWeek}  sub={`≈ ${tokensToHours(tokensCompletedWeek).toFixed(1)}h`}  accent="green" />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="% carga semanal"
              value={`${weeklyLoadPct}%`}
              sub="completado / asignado"
              accent={weeklyLoadPct >= 70 ? 'green' : weeklyLoadPct >= 40 ? 'yellow' : 'red'}
            />
          </div>
        </section>

        {/* Tiempos */}
        <section>
          <SectionTitle>Tiempos de entrega</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Clock className="w-4 h-4" />} label="Ciclo promedio (inicio → fin)" value={avgCycle !== null ? `${avgCycle.toFixed(1)}d` : '—'} sub="started_at → completed_at" accent="violet" />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Lead time promedio"           value={avgLead  !== null ? `${avgLead.toFixed(1)}d`  : '—'} sub="created_at → completed_at" accent="violet" />
          </div>
        </section>

        {/* Distribución de urgencia */}
        <section>
          <SectionTitle>Distribución de urgencia (activas)</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['critical', 'high', 'medium', 'low'] as const).map((u) => (
              <div key={u} className={`rounded-xl p-3 border ${u === 'critical' ? 'bg-red-500/5 border-red-500/20' : u === 'high' ? 'bg-orange-500/5 border-orange-500/20' : u === 'medium' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/3 border-white/8'}`}>
                <p className={`text-[10px] uppercase tracking-wider mb-1 ${URGENCY_CONFIG[u].className.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>{URGENCY_CONFIG[u].label}</p>
                <p className="text-2xl font-bold text-white">{urgencyDist[u]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Carga por usuario — solo leader/admin */}
        {isLeaderOrAdmin && workload.length > 0 && (
          <section>
            <SectionTitle>Carga por usuario</SectionTitle>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-neutral-500 text-left">
                    <th className="px-4 py-2.5 font-medium">Usuario</th>
                    <th className="px-3 py-2.5 font-medium text-center">Activas</th>
                    <th className="px-3 py-2.5 font-medium text-right">En progreso</th>
                    <th className="px-3 py-2.5 font-medium text-right">Completados</th>
                    <th className="px-3 py-2.5 font-medium text-right">Capacidad</th>
                    <th className="px-4 py-2.5 font-medium">Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((w) => {
                    const pct = Math.min(100, Math.round((w.tokensInProgress / w.capacity) * 100))
                    const isOverloaded = pct > 100
                    return (
                      <tr key={w.userId} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {initials(w.userId, users)}
                            </div>
                            <span className="text-white">{displayName(w.userId, users)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-neutral-400">{w.todo + w.inProgress}</td>
                        <td className="px-3 py-3 text-right text-yellow-400">
                          {w.tokensInProgress} <span className="text-neutral-600">({tokensToHours(w.tokensInProgress).toFixed(1)}h)</span>
                        </td>
                        <td className="px-3 py-3 text-right text-green-400">
                          {w.tokensCompleted} <span className="text-neutral-600">({tokensToHours(w.tokensCompleted).toFixed(1)}h)</span>
                        </td>
                        <td className="px-3 py-3 text-right text-neutral-400">
                          {w.capacity} <span className="text-neutral-600">({tokensToHours(w.capacity).toFixed(0)}h/sem)</span>
                        </td>
                        <td className="px-4 py-3 w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isOverloaded ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] tabular-nums ${isOverloaded ? 'text-red-400' : 'text-neutral-500'}`}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Impacto vs Esfuerzo */}
        <section>
          <SectionTitle>Impacto vs Esfuerzo</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-green-400 mb-1">Alto impacto · Bajo esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.highImpactLowEffort}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Quick wins — priorizar</p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Alto impacto · Alto esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.highImpactHighEffort}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Estratégicas — planificar</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Bajo impacto · Bajo esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.lowImpactLowEffort}</p>
              <p className="text-[11px] text-neutral-600 mt-1">Relleno — cuando haya tiempo</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Bajo impacto · Alto esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.lowImpactHighEffort}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Evitar — costo-beneficio negativo</p>
            </div>
          </div>
        </section>

        {/* Tareas vencidas */}
        {overdue.length > 0 && (
          <section>
            <SectionTitle>Tareas vencidas ({overdue.length})</SectionTitle>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-red-500/10 text-red-400/70 text-left">
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
                          <td className="px-4 py-3 text-white max-w-[240px] truncate">{t.title}</td>
                          {isLeaderOrAdmin && (
                            <td className="px-3 py-3 text-neutral-400">{displayName(t.assigned_to ?? t.user_id, users)}</td>
                          )}
                          <td className="px-4 py-3 text-right text-red-400">
                            {new Date(t.due_date!).toLocaleDateString('es')}
                            <span className="ml-2 text-red-500/60">(+{daysLate}d)</span>
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
