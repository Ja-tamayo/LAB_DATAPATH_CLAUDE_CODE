import { redirect } from 'next/navigation'
import { ArrowLeft, AlertCircle, Clock, Users, Zap, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { type Task, type UserRole, tokensToHours } from '@/types/tasks'
import { type UserOption } from '@/actions/users'

export const metadata = {
  title: 'Operacional — TaskFlow AI',
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function startOfWeek(): Date {
  const d = new Date()
  const day = d.getDay()         // 0=Sun…6=Sat
  const diff = (day + 6) % 7    // Mon=0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  return d
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
}

function initials(user: UserOption): string {
  if (user.full_name) {
    return user.full_name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return user.id.slice(0, 2).toUpperCase()
}

function displayName(userId: string, users: UserOption[]): string {
  const u = users.find((x) => x.id === userId)
  if (!u) return userId.slice(0, 8)
  return u.full_name ?? u.id.slice(0, 8)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'blue',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
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
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-[11px] text-neutral-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">
      {children}
    </h2>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tasks, role, users] = await Promise.all([
    getTasks(),
    getCurrentUserRole(),
    getUsers(),
  ])

  if (role !== 'leader' && role !== 'admin_system') redirect('/dashboard')

  const now = new Date()
  const weekStart = startOfWeek()

  // ── Status counts ────────────────────────────────────────────────────────
  const byStatus = {
    todo:        tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done:        tasks.filter((t) => t.status === 'done').length,
  }

  // ── Overdue ──────────────────────────────────────────────────────────────
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < now,
  )

  // ── Tokens this week ─────────────────────────────────────────────────────
  const tokensAssignedWeek = tasks
    .filter((t) => new Date(t.created_at) >= weekStart)
    .reduce((sum, t) => sum + (t.effort_tokens ?? 0), 0)

  const tokensCompletedWeek = tasks
    .filter(
      (t) =>
        t.status === 'done' &&
        t.completed_at &&
        new Date(t.completed_at) >= weekStart,
    )
    .reduce((sum, t) => sum + (t.effort_tokens ?? 0), 0)

  // ── Cycle time (started_at → completed_at) ───────────────────────────────
  const cycleTimes = tasks
    .map((t) => daysBetween(t.started_at, t.completed_at))
    .filter((v): v is number => v !== null && v >= 0)

  const avgCycle =
    cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : null

  // ── Lead time (created_at → completed_at) ────────────────────────────────
  const leadTimes = tasks
    .filter((t) => t.status === 'done' && t.completed_at)
    .map((t) => daysBetween(t.created_at, t.completed_at))
    .filter((v): v is number => v !== null && v >= 0)

  const avgLead =
    leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : null

  // ── Workload by user ─────────────────────────────────────────────────────
  type UserLoad = {
    userId: string
    total: number
    done: number
    inProgress: number
    todo: number
    tokens: number
    tokensCompleted: number
  }

  const loadMap = new Map<string, UserLoad>()

  for (const t of tasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!loadMap.has(uid)) {
      loadMap.set(uid, {
        userId: uid,
        total: 0,
        done: 0,
        inProgress: 0,
        todo: 0,
        tokens: 0,
        tokensCompleted: 0,
      })
    }
    const entry = loadMap.get(uid)!
    entry.total++
    entry.tokens += t.effort_tokens ?? 0
    if (t.status === 'done') { entry.done++; entry.tokensCompleted += t.effort_tokens ?? 0 }
    else if (t.status === 'in_progress') entry.inProgress++
    else entry.todo++
  }

  const workload = [...loadMap.values()].sort((a, b) => b.tokens - a.tokens)
  const maxTokens = workload.reduce((m, w) => Math.max(m, w.tokens), 0)

  // Weekly load %: tokens completed this week / tokens assigned this week
  const weeklyLoadPct =
    tokensAssignedWeek > 0
      ? Math.round((tokensCompletedWeek / tokensAssignedWeek) * 100)
      : 0

  // ── Impact vs Effort matrix counts ───────────────────────────────────────
  const impactEffort = {
    highImpactLowEffort:  tasks.filter(
      (t) => (t.impact_level === 'high' || t.impact_level === 'critical') && (t.effort_tokens ?? 999) <= 4,
    ).length,
    highImpactHighEffort: tasks.filter(
      (t) => (t.impact_level === 'high' || t.impact_level === 'critical') && (t.effort_tokens ?? 0) > 4,
    ).length,
    lowImpactLowEffort:   tasks.filter(
      (t) => (t.impact_level === 'low' || t.impact_level === 'medium') && (t.effort_tokens ?? 999) <= 4,
    ).length,
    lowImpactHighEffort:  tasks.filter(
      (t) => (t.impact_level === 'low' || t.impact_level === 'medium') && (t.effort_tokens ?? 0) > 4,
    ).length,
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-white/5 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-white/20 text-sm">/</span>
        <span className="text-sm font-medium text-white">Operacional</span>
      </header>

      <main className="flex-1 p-6 overflow-auto space-y-8 max-w-6xl mx-auto w-full">

        {/* ── Overview stats ──────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Resumen</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Por hacer"
              value={byStatus.todo}
              accent="blue"
            />
            <StatCard
              icon={<Zap className="w-4 h-4" />}
              label="En progreso"
              value={byStatus.in_progress}
              accent="yellow"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Terminadas"
              value={byStatus.done}
              accent="green"
            />
            <StatCard
              icon={<AlertCircle className="w-4 h-4" />}
              label="Vencidas"
              value={overdue.length}
              accent="red"
            />
          </div>
        </section>

        {/* ── Tokens this week ────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Tokens esta semana</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Tokens asignados"
              value={tokensAssignedWeek}
              sub={`≈ ${tokensToHours(tokensAssignedWeek).toFixed(1)}h`}
              accent="blue"
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Tokens completados"
              value={tokensCompletedWeek}
              sub={`≈ ${tokensToHours(tokensCompletedWeek).toFixed(1)}h`}
              accent="green"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="% carga semanal"
              value={`${weeklyLoadPct}%`}
              sub="completado / asignado"
              accent={weeklyLoadPct >= 70 ? 'green' : weeklyLoadPct >= 40 ? 'yellow' : 'red'}
            />
          </div>
        </section>

        {/* ── Cycle + Lead time ───────────────────────────────────────────── */}
        <section>
          <SectionTitle>Tiempos de entrega</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Tiempo de ciclo promedio"
              value={avgCycle !== null ? `${avgCycle.toFixed(1)} días` : '—'}
              sub="desde inicio hasta completado"
              accent="violet"
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Lead time promedio"
              value={avgLead !== null ? `${avgLead.toFixed(1)} días` : '—'}
              sub="desde creación hasta completado"
              accent="violet"
            />
          </div>
        </section>

        {/* ── Workload by user ────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Carga por usuario</SectionTitle>
          {workload.length === 0 ? (
            <p className="text-xs text-neutral-600">Sin datos</p>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-neutral-500 text-left">
                    <th className="px-4 py-2.5 font-medium">Usuario</th>
                    <th className="px-3 py-2.5 font-medium text-center">Por hacer</th>
                    <th className="px-3 py-2.5 font-medium text-center">En progreso</th>
                    <th className="px-3 py-2.5 font-medium text-center">Terminadas</th>
                    <th className="px-3 py-2.5 font-medium text-right">Tokens total</th>
                    <th className="px-4 py-2.5 font-medium">Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((w) => {
                    const barPct = maxTokens > 0 ? (w.tokens / maxTokens) * 100 : 0
                    return (
                      <tr key={w.userId} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {initials(users.find((u) => u.id === w.userId) ?? { id: w.userId, email: '', full_name: null })}
                            </div>
                            <span className="text-white">{displayName(w.userId, users)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-neutral-400">{w.todo}</td>
                        <td className="px-3 py-3 text-center text-yellow-400">{w.inProgress}</td>
                        <td className="px-3 py-3 text-center text-green-400">{w.done}</td>
                        <td className="px-3 py-3 text-right text-neutral-300">
                          {w.tokens} <span className="text-neutral-600">({tokensToHours(w.tokens).toFixed(1)}h)</span>
                        </td>
                        <td className="px-4 py-3 w-36">
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Impact vs Effort matrix ─────────────────────────────────────── */}
        <section>
          <SectionTitle>Impacto vs Esfuerzo</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {/* High impact, Low effort — Quick wins */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-green-400 mb-1">Alto impacto · Bajo esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.highImpactLowEffort}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Quick wins — priorizar</p>
            </div>
            {/* High impact, High effort — Strategic */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Alto impacto · Alto esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.highImpactHighEffort}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Estratégicas — planificar</p>
            </div>
            {/* Low impact, Low effort — Fill-in */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Bajo impacto · Bajo esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.lowImpactLowEffort}</p>
              <p className="text-[11px] text-neutral-600 mt-1">Relleno — cuando haya tiempo</p>
            </div>
            {/* Low impact, High effort — Avoid */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Bajo impacto · Alto esfuerzo</p>
              <p className="text-3xl font-bold text-white">{impactEffort.lowImpactHighEffort}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Evitar — costo-beneficio negativo</p>
            </div>
          </div>
        </section>

        {/* ── Overdue task list ───────────────────────────────────────────── */}
        {overdue.length > 0 && (
          <section>
            <SectionTitle>Tareas vencidas ({overdue.length})</SectionTitle>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-red-500/10 text-red-400/70 text-left">
                    <th className="px-4 py-2.5 font-medium">Tarea</th>
                    <th className="px-3 py-2.5 font-medium">Asignada a</th>
                    <th className="px-4 py-2.5 font-medium text-right">Fecha límite</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue
                    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                    .map((t) => {
                      const assignee = t.assigned_to ?? t.user_id
                      const daysLate = Math.round(
                        (now.getTime() - new Date(t.due_date!).getTime()) / 86_400_000,
                      )
                      return (
                        <tr key={t.id} className="border-b border-red-500/10 last:border-0">
                          <td className="px-4 py-3 text-white max-w-[240px] truncate">{t.title}</td>
                          <td className="px-3 py-3 text-neutral-400">{displayName(assignee, users)}</td>
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
