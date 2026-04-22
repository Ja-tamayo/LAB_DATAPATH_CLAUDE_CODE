import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { type UserOption } from '@/actions/users'
import { tokensToHours, getUrgency } from '@/types/tasks'
import { RoleSelect } from '@/components/role-select'
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

  const isAdmin = role === 'admin_system'
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // ── Per-user stats ──────────────────────────────────────────────────────────
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

  const statsMap = new Map<string, UserStats>()
  for (const u of users) {
    statsMap.set(u.id, {
      user: u,
      activeTasks: 0, tokensAssigned: 0, tokensInProgress: 0,
      tokensCompletedTotal: 0, capacity: u.weekly_capacity_tokens,
      overdueTasks: 0, urgentTasks: 0,
    })
  }

  for (const t of tasks) {
    const uid = t.assigned_to ?? t.user_id
    if (!statsMap.has(uid)) {
      statsMap.set(uid, {
        user: { id: uid, email: '', full_name: null, role: 'collaborator', weekly_capacity_tokens: 40 },
        activeTasks: 0, tokensAssigned: 0, tokensInProgress: 0,
        tokensCompletedTotal: 0, capacity: 40, overdueTasks: 0, urgentTasks: 0,
      })
    }
    const s = statsMap.get(uid)!
    if (t.status !== 'done') {
      s.activeTasks++
      s.tokensAssigned += t.effort_tokens ?? 0
      if (t.status === 'in_progress') s.tokensInProgress += t.effort_tokens ?? 0
      if (t.due_date && t.due_date < todayStr) s.overdueTasks++
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
        <div>
          <h1 className="text-sm font-medium text-neutral-300">Personas &amp; Equipo</h1>
          {isAdmin && <p className="text-[10px] text-neutral-600">Gestión de roles activa</p>}
        </div>
        <p className="text-[10px] text-neutral-600">{users.length} miembro{users.length !== 1 ? 's' : ''}</p>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {stats.length === 0 ? (
          <p className="text-xs text-neutral-600 mt-8 text-center">No hay miembros del equipo aún.</p>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[200px_80px_100px_100px_100px_1fr] gap-3 px-3 mb-1.5 text-[9px] uppercase tracking-wider text-neutral-600">
              <span>Miembro</span>
              <span className="text-right">Activas</span>
              <span className="text-right">Tokens act.</span>
              <span className="text-right">Tokens ✓</span>
              <span className="text-right">Alertas</span>
              <span>Carga</span>
            </div>

            <div className="flex flex-col gap-2">
              {stats.map((s) => {
                const loadPct   = s.capacity > 0 ? Math.round((s.tokensInProgress / s.capacity) * 100) : 0
                const isOver    = loadPct > 100
                const isSelf    = s.user.id === user.id

                return (
                  <div
                    key={s.user.id}
                    className="bg-white/[0.03] border border-white/8 rounded-xl px-3 py-3 grid grid-cols-[200px_80px_100px_100px_100px_1fr] gap-3 items-center"
                  >
                    {/* Identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {initials(s.user)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {s.user.full_name ?? s.user.id.slice(0, 8)}
                          {isSelf && <span className="ml-1 text-[9px] text-neutral-600">(yo)</span>}
                        </p>
                        {/* Role: select for admin, badge otherwise */}
                        {isAdmin ? (
                          <RoleSelect userId={s.user.id} currentRole={s.user.role} isSelf={isSelf} />
                        ) : (
                          <span className={cn('text-[9px] px-1 py-0.5 rounded font-semibold', s.user.role === 'admin_system' ? 'bg-violet-500/20 text-violet-400' : s.user.role === 'leader' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400')}>
                            {s.user.role === 'admin_system' ? 'Admin' : s.user.role === 'leader' ? 'Líder' : 'Colaborador'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active tasks */}
                    <p className="text-sm font-semibold text-white text-right">{s.activeTasks}</p>

                    {/* Tokens assigned */}
                    <p className="text-sm font-semibold text-white text-right">
                      {s.tokensAssigned}
                      <span className="text-[9px] text-neutral-600 ml-0.5">({tokensToHours(s.tokensAssigned).toFixed(1)}h)</span>
                    </p>

                    {/* Tokens completed */}
                    <p className="text-sm font-semibold text-green-400 text-right">
                      {s.tokensCompletedTotal}
                      <span className="text-[9px] text-neutral-600 ml-0.5">({tokensToHours(s.tokensCompletedTotal).toFixed(1)}h)</span>
                    </p>

                    {/* Alerts */}
                    <div className="flex flex-col gap-0.5 items-end">
                      {s.overdueTasks > 0 && (
                        <span className="text-[9px] text-red-400 bg-red-500/10 px-1 py-0.5 rounded">
                          {s.overdueTasks} vencida{s.overdueTasks !== 1 ? 's' : ''}
                        </span>
                      )}
                      {s.urgentTasks > 0 && (
                        <span className="text-[9px] text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">
                          {s.urgentTasks} urgente{s.urgentTasks !== 1 ? 's' : ''}
                        </span>
                      )}
                      {s.overdueTasks === 0 && s.urgentTasks === 0 && (
                        <span className="text-[9px] text-neutral-700">—</span>
                      )}
                    </div>

                    {/* Load bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : loadPct > 70 ? 'bg-yellow-500' : 'bg-blue-500')}
                          style={{ width: `${Math.min(loadPct, 100)}%` }}
                        />
                      </div>
                      <span className={cn('text-[10px] tabular-nums shrink-0 w-8 text-right', isOver ? 'text-red-400' : 'text-neutral-600')}>
                        {loadPct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
