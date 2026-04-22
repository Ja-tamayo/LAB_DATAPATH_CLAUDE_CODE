import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { type UserOption } from '@/actions/users'
import { tokensToHours, ROLE_CONFIG, getUrgency } from '@/types/tasks'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Personas — TaskFlow AI' }

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

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // ── Compute per-user stats ──────────────────────────────────────────────

  type UserStats = {
    user: UserOption
    activeTasks: number
    tokensAssigned: number      // all non-done effort tokens
    tokensInProgress: number    // in-progress effort tokens
    tokensCompletedTotal: number
    capacity: number
    overdueTasks: number
    soonTasks: number           // due in ≤ 3 days
    urgentTasks: number         // urgency: critical | high
  }

  const statsMap = new Map<string, UserStats>()

  // Initialize from users list (so users with no tasks still appear)
  for (const u of users) {
    statsMap.set(u.id, {
      user: u,
      activeTasks: 0,
      tokensAssigned: 0,
      tokensInProgress: 0,
      tokensCompletedTotal: 0,
      capacity: u.weekly_capacity_tokens,
      overdueTasks: 0,
      soonTasks: 0,
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
        soonTasks: 0,
        urgentTasks: 0,
      })
    }
    const s = statsMap.get(uid)!

    if (t.status !== 'done') {
      s.activeTasks++
      s.tokensAssigned += t.effort_tokens ?? 0

      if (t.status === 'in_progress') s.tokensInProgress += t.effort_tokens ?? 0

      if (t.due_date && t.due_date < todayStr) s.overdueTasks++

      if (t.due_date) {
        const daysLeft = Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000)
        if (daysLeft >= 0 && daysLeft <= 3) s.soonTasks++
      }

      const urg = getUrgency(t)
      if (urg === 'critical' || urg === 'high') s.urgentTasks++
    } else {
      s.tokensCompletedTotal += t.effort_tokens ?? 0
    }
  }

  const stats = [...statsMap.values()].sort((a, b) => b.activeTasks - a.activeTasks)

  function initials(u: UserOption): string {
    if (u.full_name) return u.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    return u.id.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <h1 className="text-sm font-medium text-neutral-300">Personas &amp; Equipo</h1>
        <p className="text-[11px] text-neutral-600">{users.length} miembro{users.length !== 1 ? 's' : ''}</p>
      </header>

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">

        {stats.length === 0 ? (
          <p className="text-xs text-neutral-600 mt-8 text-center">No hay miembros del equipo aún.</p>
        ) : (
          <div className="grid gap-3">
            {stats.map((s) => {
              const loadPct = s.capacity > 0 ? Math.round((s.tokensInProgress / s.capacity) * 100) : 0
              const isOverloaded = loadPct > 100
              const roleConfig = ROLE_CONFIG[s.user.role]

              return (
                <div
                  key={s.user.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/7 transition-colors"
                >
                  <div className="flex items-start gap-4">

                    {/* Avatar + identity */}
                    <div className="flex items-center gap-3 min-w-[160px]">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {initials(s.user)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {s.user.full_name ?? s.user.id.slice(0, 8)}
                          {s.user.id === user.id && (
                            <span className="ml-1.5 text-[9px] text-neutral-500">(yo)</span>
                          )}
                        </p>
                        <span className={cn('text-[9px] px-1 py-0.5 rounded font-semibold', roleConfig.className)}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <p className="text-[10px] text-neutral-600 mb-0.5">Tareas activas</p>
                        <p className="text-sm font-semibold text-white">{s.activeTasks}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 mb-0.5">Tokens asignados</p>
                        <p className="text-sm font-semibold text-white">
                          {s.tokensAssigned}
                          <span className="text-[10px] text-neutral-500 ml-1">
                            ({tokensToHours(s.tokensAssigned).toFixed(1)}h)
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 mb-0.5">Tokens completados</p>
                        <p className="text-sm font-semibold text-green-400">
                          {s.tokensCompletedTotal}
                          <span className="text-[10px] text-neutral-500 ml-1">
                            ({tokensToHours(s.tokensCompletedTotal).toFixed(1)}h)
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 mb-0.5">Alertas</p>
                        <div className="flex items-center gap-2">
                          {s.overdueTasks > 0 && (
                            <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                              {s.overdueTasks} vencida{s.overdueTasks !== 1 ? 's' : ''}
                            </span>
                          )}
                          {s.soonTasks > 0 && (
                            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                              {s.soonTasks} próxima{s.soonTasks !== 1 ? 's' : ''}
                            </span>
                          )}
                          {s.overdueTasks === 0 && s.soonTasks === 0 && (
                            <span className="text-[10px] text-neutral-600">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 mb-1">
                          Carga {s.tokensInProgress}/{s.capacity} tokens
                          {isOverloaded && (
                            <span className="ml-1 text-red-400">⚠ sobrecargado</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isOverloaded ? 'bg-red-500' : loadPct > 70 ? 'bg-yellow-500' : 'bg-blue-500',
                              )}
                              style={{ width: `${Math.min(loadPct, 100)}%` }}
                            />
                          </div>
                          <span className={cn(
                            'text-[10px] tabular-nums shrink-0',
                            isOverloaded ? 'text-red-400' : 'text-neutral-500',
                          )}>
                            {loadPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
