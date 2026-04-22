import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import {
  type Task, type UrgencyLevel,
  tokensToHours, getUrgency, URGENCY_CONFIG, PRIORITY_CONFIG,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { cn } from '@/lib/utils'
import { AnalyticsTabs } from '@/components/analytics-tabs'

export const metadata = { title: 'Analítica — TaskFlow AI' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
function displayName(id: string, users: UserOption[]) {
  return users.find((u) => u.id === id)?.full_name ?? id.slice(0, 8)
}
function initials(id: string, users: UserOption[]) {
  const u = users.find((x) => x.id === id)
  if (u?.full_name) return u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return id.slice(0, 2).toUpperCase()
}
const URGENCY_ORDER: Record<UrgencyLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Divider() { return <span className="w-px h-6 bg-white/8 shrink-0" /> }

function StatCell({ label, value, accent }: {
  label: string; value: string | number
  accent?: 'white' | 'green' | 'yellow' | 'red' | 'orange'
}) {
  const colors = {
    white: 'text-white', green: 'text-green-400', yellow: 'text-yellow-400',
    red: 'text-red-400', orange: 'text-orange-400',
  }
  return (
    <div>
      <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums leading-none', colors[accent ?? 'white'])}>{value}</p>
    </div>
  )
}

function InsightChip({ children, accent = 'yellow' }: { children: React.ReactNode; accent?: 'yellow' | 'red' | 'blue' }) {
  const cls = { yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', red: 'bg-red-500/10 border-red-500/20 text-red-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400' }
  return <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border', cls[accent])}>{children}</span>
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-neutral-500 tabular-nums w-6 text-right">{value}</span>
    </div>
  )
}

function DonutRing({ segments, total }: {
  segments: { color: string; value: number }[]; total: number
}) {
  if (total === 0) return <div className="w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center"><span className="text-[10px] text-neutral-700">0</span></div>
  const r = 30; const c = 40; const circumference = 2 * Math.PI * r
  let cum = 0
  const arcs = segments.map((s) => {
    const pct = s.value / total
    const dash = pct * circumference; const gap = circumference - dash
    const offset = circumference - cum * circumference; cum += pct
    return { ...s, dash, gap, offset }
  })
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
      {arcs.map((a, i) => (
        <circle key={i} cx={c} cy={c} r={r} fill="none" strokeWidth={9} stroke={a.color}
          strokeDasharray={`${a.dash} ${a.gap}`} strokeDashoffset={a.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }} />
      ))}
      <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="bold">{total}</text>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [allTasks, role, users] = await Promise.all([getTasks(), getCurrentUserRole(), getUsers()])

  const { data: myProfile } = await supabase.from('profiles').select('weekly_capacity_tokens').eq('id', user.id).single()
  const myCapacity   = (myProfile?.weekly_capacity_tokens as number) ?? 40
  const isPrivileged = role === 'leader' || role === 'admin_system'
  const now          = new Date()
  const weekStart    = startOfWeek()
  const todayStr     = now.toISOString().split('T')[0]

  // ═══════════════════════════════════════════════════════════
  //  MI CARGA — data
  // ═══════════════════════════════════════════════════════════

  const myTasks    = allTasks.filter((t) => t.assigned_to === user.id || t.task_owner_id === user.id || t.user_id === user.id)
  const myActive   = myTasks.filter((t) => t.status !== 'done')
  const myIP       = myTasks.filter((t) => t.status === 'in_progress')
  const myDoneWeek = myTasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekStart)
  const myOverdue  = myActive.filter((t) => t.due_date && t.due_date < todayStr)

  const myTokensIP       = myIP.reduce((s, t) => s + (t.effort_tokens ?? 0), 0)
  const myTokensDoneWeek = myDoneWeek.reduce((s, t) => s + (t.effort_tokens ?? 0), 0)
  const myCapacityPct    = myCapacity > 0 ? Math.min(Math.round((myTokensIP / myCapacity) * 100), 200) : 0
  const completionRate   = myActive.length + myDoneWeek.length > 0
    ? Math.round((myDoneWeek.length / (myActive.length + myDoneWeek.length)) * 100) : 0

  const myUrgency = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of myActive) myUrgency[getUrgency(t)]++

  const myTopTasks = [...myActive]
    .sort((a, b) => URGENCY_ORDER[getUrgency(a)] - URGENCY_ORDER[getUrgency(b)] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
    .slice(0, 8)

  // Backlog quality signals
  const noDate    = myActive.filter((t) => !t.due_date).length
  const noTokens  = myActive.filter((t) => !t.effort_tokens).length
  const hasInsights = noDate > 0 || noTokens > 0 || myOverdue.length > 0

  // ═══════════════════════════════════════════════════════════
  //  EQUIPO — data
  // ═══════════════════════════════════════════════════════════

  const activeTasks = allTasks.filter((t) => t.status !== 'done')
  const statusDist  = {
    todo: allTasks.filter((t) => t.status === 'todo').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    done: allTasks.filter((t) => t.status === 'done').length,
  }
  const priorityDist = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of activeTasks) priorityDist[t.priority]++
  const maxPriority = Math.max(...Object.values(priorityDist), 1)

  type UserLoad = { userId: string; activeTasks: number; inProgress: number; tokensIP: number; capacity: number; overdue: number }
  const loadMap = new Map<string, UserLoad>()
  for (const u of users) loadMap.set(u.id, { userId: u.id, activeTasks: 0, inProgress: 0, tokensIP: 0, capacity: u.weekly_capacity_tokens, overdue: 0 })
  for (const t of allTasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!loadMap.has(uid)) loadMap.set(uid, { userId: uid, activeTasks: 0, inProgress: 0, tokensIP: 0, capacity: 40, overdue: 0 })
    const e = loadMap.get(uid)!
    if (t.status !== 'done') {
      e.activeTasks++
      if (t.status === 'in_progress') { e.inProgress++; e.tokensIP += t.effort_tokens ?? 0 }
      if (t.due_date && t.due_date < todayStr) e.overdue++
    }
  }
  const workload     = [...loadMap.values()].sort((a, b) => b.activeTasks - a.activeTasks)
  const overloadedN  = workload.filter((w) => w.capacity > 0 && w.tokensIP > w.capacity).length
  const teamDoneWeek = allTasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekStart).length

  // ═══════════════════════════════════════════════════════════
  //  RIESGOS — data
  // ═══════════════════════════════════════════════════════════

  const overdueAll = activeTasks.filter((t) => t.due_date && t.due_date < todayStr)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const unassigned = activeTasks.filter((t) => !t.assigned_to)
  const highRisk   = activeTasks.filter((t) => {
    if (!t.due_date) return false
    const d = Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000)
    return d >= 0 && d <= 3 && (t.effort_tokens ?? 0) > 8
  })
  const riskScore = Math.min(100,
    overdueAll.length * 15 +
    unassigned.filter((t) => t.priority === 'critical' || t.priority === 'high').length * 10 +
    highRisk.length * 8,
  )

  // ═══════════════════════════════════════════════════════════
  //  TAB: MI CARGA
  // ═══════════════════════════════════════════════════════════

  const myLoadSection = (
    <div className="space-y-3 max-w-4xl">

      {/* ── Top stat strip ── */}
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl">
        <StatCell label="Activas"        value={myActive.length} />
        <Divider />
        <StatCell label="En progreso"    value={myIP.length}          accent="yellow" />
        <Divider />
        <StatCell label="Completadas / sem" value={myDoneWeek.length} accent="green"  />
        <Divider />
        <StatCell label="Vencidas"       value={myOverdue.length}     accent={myOverdue.length > 0 ? 'red' : 'white'} />
        <Divider />
        <StatCell label="Tasa completado" value={`${completionRate}%`} accent={completionRate >= 50 ? 'green' : completionRate > 20 ? 'yellow' : 'orange'} />
        {myCapacity > 0 && myTokensIP > 0 && (
          <>
            <Divider />
            <StatCell label="Carga actual" value={`${myCapacityPct}%`} accent={myCapacityPct > 100 ? 'red' : myCapacityPct > 70 ? 'yellow' : 'white'} />
          </>
        )}
      </div>

      {/* ── Main 2-column ── */}
      <div className="grid grid-cols-[1fr_240px] gap-3">

        {/* Left: task list — primary focus */}
        <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Mis tareas activas</p>
            <span className="text-[10px] text-neutral-600">{myActive.length} total</span>
          </div>
          {myTopTasks.length === 0 ? (
            <p className="text-xs text-neutral-700 text-center py-6">Sin tareas activas</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] text-neutral-700 uppercase tracking-wider border-b border-white/5">
                  <th className="px-4 py-2 text-left">Tarea</th>
                  <th className="px-2 py-2 text-left">Urgencia</th>
                  <th className="px-3 py-2 text-right">Vence</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {myTopTasks.map((t) => {
                  const urg = getUrgency(t)
                  const uc  = URGENCY_CONFIG[urg]
                  const daysLeft = t.due_date ? Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000) : null
                  const statusDot = t.status === 'in_progress' ? 'bg-yellow-400' : 'bg-neutral-700'
                  return (
                    <tr key={t.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] group">
                      <td className="px-4 py-2.5">
                        <span className={cn('mr-2 text-[8px] font-semibold px-1 py-px rounded', PRIORITY_CONFIG[t.priority].className)}>
                          {PRIORITY_CONFIG[t.priority].label}
                        </span>
                        <span className="text-white group-hover:text-blue-300 transition-colors">{t.title}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold', uc.className)}>{uc.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {daysLeft === null
                          ? <span className="text-neutral-700">—</span>
                          : <span className={cn(daysLeft < 0 ? 'text-red-400 font-semibold' : daysLeft <= 2 ? 'text-orange-400' : 'text-neutral-500')}>
                              {daysLeft < 0 ? `+${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                            </span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('inline-block w-2 h-2 rounded-full', statusDot)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {myActive.length > 8 && (
            <div className="px-4 py-2 border-t border-white/5">
              <Link href={`/dashboard?execution_owner=${user.id}`} className="text-[10px] text-blue-400 hover:text-blue-300">
                Ver las {myActive.length - 8} tareas restantes en el board →
              </Link>
            </div>
          )}
        </div>

        {/* Right: metrics sidebar */}
        <div className="flex flex-col gap-3">

          {/* Urgency distribution */}
          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">Distribución de urgencia</p>
            <div className="flex flex-col gap-2">
              {(['critical', 'high', 'medium', 'low'] as UrgencyLevel[]).map((lvl) => (
                <div key={lvl} className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 w-14 shrink-0 truncate">{URGENCY_CONFIG[lvl].label}</span>
                  <MiniBar
                    value={myUrgency[lvl]}
                    max={Math.max(...Object.values(myUrgency), 1)}
                    color={lvl === 'critical' ? 'bg-red-500' : lvl === 'high' ? 'bg-orange-500' : lvl === 'medium' ? 'bg-yellow-500' : 'bg-slate-600'}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Capacity (only if meaningful) */}
          {myTokensIP > 0 && (
            <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">Capacidad semanal</p>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden mb-2">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', myCapacityPct > 100 ? 'bg-red-500' : myCapacityPct > 70 ? 'bg-yellow-500' : 'bg-blue-500')}
                  style={{ width: `${Math.min(myCapacityPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600">
                <span>{myTokensIP}t en progreso</span>
                <span>Cap. {myCapacity}t</span>
              </div>
              {myTokensDoneWeek > 0 && (
                <p className="text-[10px] text-green-400 mt-1.5">{myTokensDoneWeek}t completados esta semana ({tokensToHours(myTokensDoneWeek).toFixed(1)}h)</p>
              )}
            </div>
          )}

          {/* Insight callouts */}
          {hasInsights && (
            <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">Calidad del backlog</p>
              <div className="flex flex-col gap-2">
                {myOverdue.length > 0 && (
                  <InsightChip accent="red">{myOverdue.length} tarea{myOverdue.length !== 1 ? 's' : ''} vencida{myOverdue.length !== 1 ? 's' : ''}</InsightChip>
                )}
                {noDate > 0 && (
                  <InsightChip accent="yellow">{noDate} sin fecha límite</InsightChip>
                )}
                {noTokens > 0 && (
                  <InsightChip accent="blue">{noTokens} sin estimación</InsightChip>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════
  //  TAB: EQUIPO
  // ═══════════════════════════════════════════════════════════

  const teamSection = (
    <div className="space-y-3 max-w-4xl">

      {/* Team stat strip */}
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl">
        <StatCell label="Total activas"        value={activeTasks.length} />
        <Divider />
        <StatCell label="En progreso"          value={statusDist.in_progress} accent="yellow" />
        <Divider />
        <StatCell label="Completadas esta sem" value={teamDoneWeek}           accent="green"  />
        <Divider />
        <StatCell label="Terminadas"           value={statusDist.done}        accent="green"  />
        {overloadedN > 0 && (
          <>
            <Divider />
            <StatCell label="Personas sobrecargadas" value={overloadedN} accent="red" />
          </>
        )}
      </div>

      {/* Team table */}
      <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Carga por persona</p>
        </div>
        {workload.length === 0 ? (
          <p className="text-xs text-neutral-700 text-center py-6">Sin datos de carga</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] text-neutral-700 uppercase tracking-wider border-b border-white/5">
                <th className="px-4 py-2 text-left">Persona</th>
                <th className="px-3 py-2 text-right">Activas</th>
                <th className="px-3 py-2 text-right">En progreso</th>
                <th className="px-3 py-2 text-right">Tokens IP</th>
                <th className="px-3 py-2 text-right">Vencidas</th>
                <th className="px-5 py-2 text-left w-36">Carga</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((w) => {
                const pct    = w.capacity > 0 ? Math.round((w.tokensIP / w.capacity) * 100) : 0
                const isOver = pct > 100
                return (
                  <tr key={w.userId} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {initials(w.userId, users)}
                        </div>
                        <span className="text-white">{displayName(w.userId, users)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-neutral-400 tabular-nums">{w.activeTasks}</td>
                    <td className="px-3 py-2.5 text-right text-yellow-400 tabular-nums">{w.inProgress}</td>
                    <td className="px-3 py-2.5 text-right text-neutral-400 tabular-nums">{w.tokensIP}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {w.overdue > 0
                        ? <span className="text-red-400 font-semibold">{w.overdue}</span>
                        : <span className="text-neutral-700">—</span>
                      }
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-blue-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={cn('text-[10px] tabular-nums w-8 text-right font-medium', isOver ? 'text-red-400' : 'text-neutral-600')}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Distribution row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">Estado general</p>
          <div className="flex items-center gap-4">
            <DonutRing
              total={allTasks.length}
              segments={[
                { color: '#3b82f6', value: statusDist.todo },
                { color: '#eab308', value: statusDist.in_progress },
                { color: '#22c55e', value: statusDist.done },
              ]}
            />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {[
                { label: 'Por hacer',   value: statusDist.todo,        color: 'bg-blue-500'   },
                { label: 'En progreso', value: statusDist.in_progress, color: 'bg-yellow-500' },
                { label: 'Terminado',   value: statusDist.done,        color: 'bg-green-500'  },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.color)} />
                  <span className="text-[10px] text-neutral-500 flex-1">{s.label}</span>
                  <span className="text-[10px] text-neutral-300 tabular-nums font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">Prioridad (activas)</p>
          <div className="flex flex-col gap-2">
            {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
              <div key={p} className="flex items-center gap-2">
                <span className={cn('text-[9px] px-1 py-px rounded font-semibold w-14 text-center shrink-0', PRIORITY_CONFIG[p].className)}>{PRIORITY_CONFIG[p].label}</span>
                <MiniBar
                  value={priorityDist[p]}
                  max={maxPriority}
                  color={p === 'critical' ? 'bg-red-600' : p === 'high' ? 'bg-red-400' : p === 'medium' ? 'bg-yellow-400' : 'bg-green-500'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════
  //  TAB: RIESGOS
  // ═══════════════════════════════════════════════════════════

  const riskColor = riskScore === 0 ? 'text-green-400' : riskScore < 30 ? 'text-yellow-400' : riskScore < 60 ? 'text-orange-400' : 'text-red-400'
  const riskLabel = riskScore === 0 ? 'Sin riesgos' : riskScore < 30 ? 'Bajo' : riskScore < 60 ? 'Moderado' : 'Alto'

  const risksSection = (
    <div className="space-y-3 max-w-4xl">

      {/* Risk summary strip */}
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl">
        <div>
          <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-0.5">Nivel de riesgo</p>
          <p className={cn('text-lg font-bold', riskColor)}>{riskLabel}</p>
        </div>
        <Divider />
        <StatCell label="Tareas vencidas"       value={overdueAll.length}  accent={overdueAll.length > 0 ? 'red' : 'white'} />
        <Divider />
        <StatCell label="Sin responsable"       value={unassigned.length}  accent={unassigned.length > 0 ? 'orange' : 'white'} />
        <Divider />
        <StatCell label="Alto esfuerzo urgente" value={highRisk.length}    accent={highRisk.length > 0 ? 'yellow' : 'white'} />
      </div>

      {riskScore === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-2xl">✓</p>
          <p className="text-sm text-green-400 font-medium">Sin riesgos identificados</p>
          <p className="text-[11px] text-neutral-600">Todas las tareas tienen responsable y están dentro de plazo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">

          {/* Overdue */}
          {overdueAll.length > 0 && (
            <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Tareas vencidas ({overdueAll.length})</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] text-red-400/50 uppercase tracking-wider border-b border-red-500/10">
                    <th className="px-4 py-2 text-left">Tarea</th>
                    <th className="px-3 py-2 text-left">Responsable</th>
                    <th className="px-3 py-2 text-right">Días vencida</th>
                    <th className="px-3 py-2 text-left">Prioridad</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {overdueAll.slice(0, 8).map((t) => {
                    const late = Math.round((now.getTime() - new Date(t.due_date!).getTime()) / 86_400_000)
                    return (
                      <tr key={t.id} className="border-b border-red-500/[0.08] last:border-0 hover:bg-red-500/[0.03]">
                        <td className="px-4 py-2.5 text-white max-w-[200px] truncate">{t.title}</td>
                        <td className="px-3 py-2.5 text-neutral-500">{displayName(t.assigned_to ?? t.user_id, users)}</td>
                        <td className="px-3 py-2.5 text-right"><span className="text-red-400 font-semibold tabular-nums">+{late}d</span></td>
                        <td className="px-3 py-2.5"><span className={cn('text-[9px] px-1 py-px rounded font-semibold', PRIORITY_CONFIG[t.priority].className)}>{PRIORITY_CONFIG[t.priority].label}</span></td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href={`/dashboard?execution_owner=${t.assigned_to ?? t.user_id}&overdue=1`} className="text-[10px] text-blue-400 hover:text-blue-300">Ver →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="bg-orange-500/[0.04] border border-orange-500/15 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-orange-500/10">
                <User className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">Sin responsable de ejecución ({unassigned.length})</p>
              </div>
              <div className="flex flex-col">
                {unassigned.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2 border-b border-orange-500/[0.08] last:border-0">
                    <span className={cn('text-[9px] px-1 py-px rounded font-semibold shrink-0', PRIORITY_CONFIG[t.priority].className)}>{PRIORITY_CONFIG[t.priority].label}</span>
                    <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                    {t.due_date && <span className="text-[10px] text-neutral-600 shrink-0">{new Date(t.due_date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-orange-500/10">
                <Link href="/dashboard" className="text-[10px] text-blue-400 hover:text-blue-300">Asignar en el board →</Link>
              </div>
            </div>
          )}

          {/* High risk delivery */}
          {highRisk.length > 0 && (
            <div className="bg-yellow-500/[0.04] border border-yellow-500/15 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-yellow-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">Alto esfuerzo · Plazo ≤3 días ({highRisk.length})</p>
              </div>
              <div className="flex flex-col">
                {highRisk.map((t) => {
                  const d = Math.round((new Date(t.due_date!).getTime() - now.getTime()) / 86_400_000)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2 border-b border-yellow-500/[0.08] last:border-0">
                      <span className="text-[9px] px-1 py-px rounded bg-yellow-500/20 text-yellow-400 shrink-0 tabular-nums">{d}d</span>
                      <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                      <span className="text-[10px] text-neutral-500 shrink-0">{t.effort_tokens}t · {displayName(t.assigned_to ?? t.user_id, users)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full min-h-screen">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <h1 className="text-sm font-medium text-neutral-300">Analítica</h1>
        <p className="text-[10px] text-neutral-600">{allTasks.length} tareas totales</p>
      </header>
      <AnalyticsTabs isPrivileged={isPrivileged} myLoad={myLoadSection} team={teamSection} risks={risksSection} />
    </div>
  )
}
