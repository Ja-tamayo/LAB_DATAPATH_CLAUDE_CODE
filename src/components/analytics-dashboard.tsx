'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, User, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Task, type UrgencyLevel,
  tokensToHours, getUrgency, URGENCY_CONFIG, PRIORITY_CONFIG,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { type ClientOption } from '@/actions/clients'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId     = 'my_load' | 'team' | 'clients' | 'risks'
type PeriodKey = 'week' | 'month' | '30d' | 'quarter' | 'year' | 'all' | 'custom'

export interface AnalyticsDashboardProps {
  tasks:               Task[]
  users:               UserOption[]
  registeredClients?:  ClientOption[]
  currentUserId:       string
  currentUserCapacity: number
  isPrivileged:        boolean
}

// ── Periods ───────────────────────────────────────────────────────────────────

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week',    label: 'Esta semana' },
  { key: 'month',   label: 'Este mes'    },
  { key: '30d',     label: 'Últ. 30d'   },
  { key: 'quarter', label: 'Trimestre'   },
  { key: 'year',    label: 'Este año'    },
  { key: 'all',     label: 'Todo'        },
  { key: 'custom',  label: 'Personalizado' },
]

function getPeriodStart(p: PeriodKey, customFrom?: string): Date | null {
  if (p === 'all') return null
  if (p === 'custom') return customFrom ? new Date(customFrom + 'T00:00:00') : null
  const n = new Date()
  if (p === 'week')    { const d = new Date(n); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d }
  if (p === 'month')   return new Date(n.getFullYear(), n.getMonth(), 1)
  if (p === '30d')     { const d = new Date(n); d.setDate(d.getDate()-30); return d }
  if (p === 'quarter') return new Date(n.getFullYear(), Math.floor(n.getMonth()/3)*3, 1)
  return new Date(n.getFullYear(), 0, 1)
}

function inPeriod(dateStr: string | null | undefined, ps: Date | null, pe?: Date | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (ps && d < ps) return false
  if (pe && d > pe) return false
  return true
}

// Active task relevance: always show overdue + tasks due within period + no-due-date tasks
// Done tasks: only if completed_at falls in the period
function inOrBeforePeriod(task: Task, ps: Date | null, pe: Date | null): boolean {
  if (!ps && !pe) return true
  if (task.status === 'done') return inPeriod(task.completed_at, ps, pe)
  if (!task.due_date) return true          // floating tasks always visible
  const due = new Date(task.due_date)
  if (ps && due < ps) return true          // overdue — always keep visible
  if (pe && due > pe) return false         // due after period end — hide
  return true
}

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Divider() { return <span className="w-px h-6 bg-white/8 shrink-0" /> }

function StatCell({ label, value, sub, accent = 'white' }: {
  label: string; value: string | number; sub?: string
  accent?: 'white' | 'green' | 'yellow' | 'red' | 'orange' | 'blue'
}) {
  const colors = { white: 'text-white', green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400', orange: 'text-orange-400', blue: 'text-blue-400' }
  return (
    <div>
      <p className="text-xs text-neutral-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums leading-none', colors[accent])}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function InsightChip({ children, accent = 'yellow' }: { children: React.ReactNode; accent?: 'yellow' | 'red' | 'blue' }) {
  const cls = { yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', red: 'bg-red-500/10 border-red-500/20 text-red-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400' }
  return <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border', cls[accent])}>{children}</span>
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500 tabular-nums w-6 text-right">{value}</span>
    </div>
  )
}

function HoursBar({ done, total }: { done: number; total: number }) {
  const scope   = Math.max(total, 1)
  const donePct = Math.min((done / scope) * 100, 100)
  const remPct  = Math.min(((total - done) / scope) * 100, 100)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden flex">
        <div className="h-full bg-green-500/60 transition-all" style={{ width: `${donePct}%` }} />
        <div className="h-full bg-blue-500/25 transition-all"  style={{ width: `${remPct}%`  }} />
      </div>
      <span className="text-xs text-neutral-500 tabular-nums shrink-0 w-24 text-right">
        {tokensToHours(done).toFixed(1)}h / {tokensToHours(total).toFixed(1)}h
      </span>
    </div>
  )
}

function DonutRing({ segments, total }: { segments: { color: string; value: number }[]; total: number }) {
  if (total === 0) return (
    <div className="w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center">
      <span className="text-xs text-neutral-700">0</span>
    </div>
  )
  const r = 30; const c = 40; const circ = 2 * Math.PI * r
  let cum = 0
  const arcs = segments.map(s => {
    const pct = s.value / total; const dash = pct * circ; const gap = circ - dash
    const offset = circ - cum * circ; cum += pct
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ tasks, users, registeredClients = [], currentUserId, currentUserCapacity, isPrivileged }: AnalyticsDashboardProps) {
  const [activeTab,       setActiveTab]       = useState<TabId>('my_load')
  const [period,          setPeriod]          = useState<PeriodKey>('all')
  const [customFrom,      setCustomFrom]      = useState('')
  const [customTo,        setCustomTo]        = useState('')
  const [selectedUser,    setSelectedUser]    = useState<string>('all')
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  const now      = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now])
  const ps       = useMemo(() => getPeriodStart(period, customFrom), [period, customFrom])
  const pe       = useMemo(() => {
    if (period === 'all') return null
    if (period === 'custom') return customTo ? new Date(customTo + 'T23:59:59') : null
    // For standard periods: no upper bound (show everything from ps up to and including future due dates)
    return null
  }, [period, customTo])
  const periodLabel = period === 'custom'
    ? (customFrom || customTo) ? `${customFrom || '…'} → ${customTo || '…'}` : 'Rango personalizado'
    : PERIODS.find(p => p.key === period)?.label

  // ── Scoped tasks (user filter) ─────────────────────────────────────────────

  const scopedTasks = useMemo(() =>
    selectedUser === 'all' ? tasks
      : tasks.filter(t => t.assigned_to === selectedUser || t.task_owner_id === selectedUser || t.user_id === selectedUser),
  [tasks, selectedUser])

  // Period-filtered slice used by Team + Clients tabs (active tasks pruned by due_date)
  const periodTasks = useMemo(() =>
    (!ps && !pe) ? scopedTasks : scopedTasks.filter(t => inOrBeforePeriod(t, ps, pe)),
  [scopedTasks, ps, pe])

  // ── MY LOAD ────────────────────────────────────────────────────────────────

  // Active tasks always show in full (never hide overdue tasks from your own queue)
  const myTasks   = useMemo(() => tasks.filter(t => t.assigned_to === currentUserId || t.task_owner_id === currentUserId || t.user_id === currentUserId), [tasks, currentUserId])
  const myActive  = useMemo(() => myTasks.filter(t => t.status !== 'done'), [myTasks])
  const myIP      = useMemo(() => myTasks.filter(t => t.status === 'in_progress'), [myTasks])
  const myDone    = useMemo(() => myTasks.filter(t => t.status === 'done' && inPeriod(t.completed_at, ps, pe)), [myTasks, ps, pe])
  const myOverdue = useMemo(() => myActive.filter(t => t.due_date && t.due_date < todayStr), [myActive, todayStr])

  const myTokensIP   = useMemo(() => myIP.reduce((s, t) => s + (t.effort_tokens ?? 0), 0), [myIP])
  const myTokensDone = useMemo(() => myDone.reduce((s, t) => s + (t.effort_tokens ?? 0), 0), [myDone])
  const myCapPct     = currentUserCapacity > 0 ? Math.min(Math.round((myTokensIP / currentUserCapacity) * 100), 200) : 0

  const myUrgency = useMemo(() => {
    const u = { critical: 0, high: 0, medium: 0, low: 0 }
    myActive.forEach(t => u[getUrgency(t)]++)
    return u
  }, [myActive])

  const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const myTopTasks = useMemo(() =>
    [...myActive].sort((a, b) => URGENCY_ORDER[getUrgency(a)] - URGENCY_ORDER[getUrgency(b)] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')).slice(0, 8),
  [myActive])

  const noDate   = useMemo(() => myActive.filter(t => !t.due_date).length, [myActive])
  const noTokens = useMemo(() => myActive.filter(t => !t.effort_tokens).length, [myActive])

  // ── TEAM (period-filtered) ──────────────────────────────────────────────────

  const teamTasks  = periodTasks
  const teamActive = useMemo(() => teamTasks.filter(t => t.status !== 'done'), [teamTasks])

  const statusDist = useMemo(() => ({
    todo:        teamTasks.filter(t => t.status === 'todo').length,
    in_progress: teamTasks.filter(t => t.status === 'in_progress').length,
    done:        teamTasks.filter(t => t.status === 'done').length,
  }), [teamTasks])

  const priorityDist = useMemo(() => {
    const d = { critical: 0, high: 0, medium: 0, low: 0 }
    teamActive.forEach(t => d[t.priority]++)
    return d
  }, [teamActive])

  const teamDoneInPeriod = useMemo(() => teamTasks.filter(t => t.status === 'done').length, [teamTasks])

  type UserLoad = { userId: string; activeTasks: number; inProgress: number; tokensIP: number; tokensDone: number; capacity: number; overdue: number }
  const workload = useMemo(() => {
    const map = new Map<string, UserLoad>()
    for (const u of users) map.set(u.id, { userId: u.id, activeTasks: 0, inProgress: 0, tokensIP: 0, tokensDone: 0, capacity: u.weekly_capacity_tokens, overdue: 0 })
    for (const t of teamTasks) {
      const uid = t.assigned_to ?? t.user_id
      if (!map.has(uid)) map.set(uid, { userId: uid, activeTasks: 0, inProgress: 0, tokensIP: 0, tokensDone: 0, capacity: 40, overdue: 0 })
      const e = map.get(uid)!
      if (t.status !== 'done') {
        e.activeTasks++
        if (t.status === 'in_progress') { e.inProgress++; e.tokensIP += t.effort_tokens ?? 0 }
        if (t.due_date && t.due_date < todayStr) e.overdue++
      } else {
        e.tokensDone += t.effort_tokens ?? 0
      }
    }
    return [...map.values()].sort((a, b) => b.activeTasks - a.activeTasks)
  }, [teamTasks, users, todayStr])

  const overloadedN = useMemo(() => workload.filter(w => w.capacity > 0 && w.tokensIP > w.capacity).length, [workload])

  // ── CLIENTS / PROJECTS ─────────────────────────────────────────────────────

  type ProjectStat = { project: string; tasks: Task[]; active: number; done: number; estimTokens: number; doneTokens: number; overdue: number }
  type ClientStat  = { client: string; tasks: Task[]; projects: ProjectStat[]; active: number; done: number; estimTokens: number; doneTokens: number; overdue: number }

  const clientStats = useMemo<ClientStat[]>(() => {
    const clientMap = new Map<string, Task[]>()

    // Seed with registered active clients so they always appear even with 0 tasks
    for (const rc of registeredClients) {
      if (rc.status === 'active') clientMap.set(rc.name, [])
    }

    for (const t of periodTasks) {
      const key = t.client ?? '§'
      if (!clientMap.has(key)) clientMap.set(key, [])
      clientMap.get(key)!.push(t)
    }

    return [...clientMap.entries()]
      .map(([clientKey, cTasks]): ClientStat => {
        const projectMap = new Map<string, Task[]>()

        // Seed with registered projects for this client
        const regClient = registeredClients.find(rc => rc.name === clientKey)
        for (const rp of (regClient?.projects ?? [])) {
          if (rp.status === 'active') projectMap.set(rp.name, [])
        }

        for (const t of cTasks) {
          const key = t.project ?? '§'
          if (!projectMap.has(key)) projectMap.set(key, [])
          projectMap.get(key)!.push(t)
        }

        const projects: ProjectStat[] = [...projectMap.entries()]
          .map(([projKey, pTasks]) => ({
            project:     projKey === '§' ? '(Sin proyecto)' : projKey,
            tasks:       pTasks,
            active:      pTasks.filter(t => t.status !== 'done').length,
            done:        pTasks.filter(t => t.status === 'done').length,
            estimTokens: pTasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.effort_tokens ?? 0), 0),
            doneTokens:  pTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.effort_tokens ?? 0), 0),
            overdue:     pTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr).length,
          }))
          .sort((a, b) => b.estimTokens - a.estimTokens)

        const singleNoProject = projects.length === 1 && projects[0].project === '(Sin proyecto)'
        return {
          client:      clientKey === '§' ? '(Sin cliente)' : clientKey,
          tasks:       cTasks,
          projects:    singleNoProject ? [] : projects,
          active:      cTasks.filter(t => t.status !== 'done').length,
          done:        cTasks.filter(t => t.status === 'done').length,
          estimTokens: cTasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.effort_tokens ?? 0), 0),
          doneTokens:  cTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.effort_tokens ?? 0), 0),
          overdue:     cTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr).length,
        }
      })
      .sort((a, b) => {
        if (a.client === '(Sin cliente)') return 1
        if (b.client === '(Sin cliente)') return -1
        return (b.estimTokens + b.doneTokens) - (a.estimTokens + a.doneTokens)
      })
  }, [periodTasks, registeredClients, todayStr])

  // ── RISKS ──────────────────────────────────────────────────────────────────

  const overdueAll = useMemo(() =>
    scopedTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
  [scopedTasks, todayStr])

  const unassigned = useMemo(() => scopedTasks.filter(t => t.status !== 'done' && !t.assigned_to), [scopedTasks])

  const highRisk = useMemo(() =>
    scopedTasks.filter(t => {
      if (t.status === 'done' || !t.due_date) return false
      const d = Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000)
      return d >= 0 && d <= 3 && (t.effort_tokens ?? 0) > 8
    }),
  [scopedTasks, now])

  const riskScore = useMemo(() => Math.min(100,
    overdueAll.length * 15 +
    unassigned.filter(t => t.priority === 'critical' || t.priority === 'high').length * 10 +
    highRisk.length * 8,
  ), [overdueAll, unassigned, highRisk])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function displayName(userId: string) {
    return users.find(u => u.id === userId)?.full_name ?? userId.slice(0, 8)
  }
  function initials(userId: string) {
    const u = users.find(x => x.id === userId)
    if (u?.full_name) return u.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    return userId.slice(0, 2).toUpperCase()
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'my_load' as TabId, label: 'Mi carga' },
    ...(isPrivileged ? [
      { id: 'team'    as TabId, label: 'Equipo'             },
      { id: 'clients' as TabId, label: 'Clientes · Proyectos' },
      { id: 'risks'   as TabId, label: 'Riesgos'            },
    ] : []),
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Global filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-lg p-0.5 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                period === p.key ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300')}>
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
            />
            <span className="text-xs text-neutral-600">→</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
            />
          </div>
        )}

        {isPrivileged && (
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
            className="bg-white/[0.03] border border-white/8 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-blue-500/50 cursor-pointer [&>option]:bg-[#1a1a2e]">
            <option value="all">Todos los usuarios</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId ? ' (yo)' : ''}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-neutral-600 ml-auto tabular-nums">
          {periodTasks.length}
          {periodTasks.length !== scopedTasks.length && (
            <span className="text-neutral-700"> / {scopedTasks.length}</span>
          )}
          {' '}tarea{periodTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === t.id ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'my_load' && (
          <MyLoadTab
            myActive={myActive} myIP={myIP} myDone={myDone} myOverdue={myOverdue}
            myTopTasks={myTopTasks} myUrgency={myUrgency}
            myTokensIP={myTokensIP} myTokensDone={myTokensDone}
            myCapPct={myCapPct} currentUserCapacity={currentUserCapacity}
            noDate={noDate} noTokens={noTokens}
            now={now} periodLabel={period !== 'all' ? periodLabel : undefined}
          />
        )}
        {activeTab === 'team' && isPrivileged && (
          <TeamTab
            teamTasks={teamTasks} teamActive={teamActive} statusDist={statusDist}
            priorityDist={priorityDist} teamDoneInPeriod={teamDoneInPeriod}
            workload={workload} overloadedN={overloadedN}
            periodLabel={period !== 'all' ? periodLabel : undefined}
            initials={initials} displayName={displayName}
          />
        )}
        {activeTab === 'clients' && isPrivileged && (
          <ClientsTab
            clientStats={clientStats} tasks={tasks}
            expandedClients={expandedClients} setExpandedClients={setExpandedClients}
            periodLabel={period !== 'all' ? periodLabel : undefined}
          />
        )}
        {activeTab === 'risks' && isPrivileged && (
          <RisksTab
            overdueAll={overdueAll} unassigned={unassigned} highRisk={highRisk}
            riskScore={riskScore} now={now}
            displayName={displayName}
          />
        )}
      </div>
    </div>
  )
}

// ── My Load Tab ───────────────────────────────────────────────────────────────

function MyLoadTab({ myActive, myIP, myDone, myOverdue, myTopTasks, myUrgency,
  myTokensIP, myTokensDone, myCapPct, currentUserCapacity,
  noDate, noTokens, now, periodLabel }: {
  myActive: Task[]; myIP: Task[]; myDone: Task[]; myOverdue: Task[]
  myTopTasks: Task[]; myUrgency: Record<string, number>
  myTokensIP: number; myTokensDone: number; myCapPct: number; currentUserCapacity: number
  noDate: number; noTokens: number; now: Date; periodLabel?: string
}) {
  const completionRate = myActive.length + myDone.length > 0
    ? Math.round((myDone.length / (myActive.length + myDone.length)) * 100) : 0
  const todayStr = now.toISOString().split('T')[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl flex-wrap">
        <StatCell label="Activas"         value={myActive.length} />
        <Divider />
        <StatCell label="En progreso"     value={myIP.length} accent="yellow" />
        <Divider />
        <StatCell label="Completadas" sub={periodLabel} value={myDone.length} accent="green" />
        <Divider />
        <StatCell label="Vencidas"        value={myOverdue.length} accent={myOverdue.length > 0 ? 'red' : 'white'} />
        <Divider />
        <StatCell label="Tasa completado" value={`${completionRate}%`} accent={completionRate >= 50 ? 'green' : completionRate > 20 ? 'yellow' : 'orange'} />
        {currentUserCapacity > 0 && myTokensIP > 0 && (
          <>
            <Divider />
            <StatCell label="Carga actual" value={`${myCapPct}%`} accent={myCapPct > 100 ? 'red' : myCapPct > 70 ? 'yellow' : 'white'} />
          </>
        )}
      </div>

      <div className="grid grid-cols-[1fr_240px] gap-3">
        <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Mis tareas activas</p>
            <span className="text-xs text-neutral-600">{myActive.length} total</span>
          </div>
          {myTopTasks.length === 0 ? (
            <p className="text-xs text-neutral-700 text-center py-6">Sin tareas activas</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-xs text-neutral-700 uppercase tracking-wider border-b border-white/5">
                  <th className="px-4 py-2 text-left">Tarea</th>
                  <th className="px-2 py-2 text-left">Urgencia</th>
                  <th className="px-3 py-2 text-right">Vence</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {myTopTasks.map(t => {
                  const urg = getUrgency(t); const uc = URGENCY_CONFIG[urg]
                  const daysLeft = t.due_date ? Math.round((new Date(t.due_date).getTime() - now.getTime()) / 86_400_000) : null
                  return (
                    <tr key={t.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-[8px] font-semibold px-1 py-px rounded shrink-0', PRIORITY_CONFIG[t.priority].className)}>{PRIORITY_CONFIG[t.priority].label}</span>
                          {t.client && <span className="text-[8px] px-1 py-px rounded bg-teal-500/15 text-teal-400 shrink-0">{t.client}</span>}
                          <span className="text-white">{t.title}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 shrink-0"><span className={cn('text-xs px-1.5 py-0.5 rounded font-semibold whitespace-nowrap', uc.className)}>{uc.label}</span></td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {daysLeft === null ? <span className="text-neutral-700">—</span>
                          : <span className={cn(daysLeft < 0 ? 'text-red-400 font-semibold' : daysLeft <= 2 ? 'text-orange-400' : 'text-neutral-500')}>
                              {daysLeft < 0 ? `+${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                            </span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('inline-block w-2 h-2 rounded-full', t.status === 'in_progress' ? 'bg-yellow-400' : 'bg-neutral-700')} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Distribución urgencia</p>
            <div className="flex flex-col gap-2">
              {(['critical', 'high', 'medium', 'low'] as UrgencyLevel[]).map(lvl => (
                <div key={lvl} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 w-14 shrink-0">{URGENCY_CONFIG[lvl].label}</span>
                  <MiniBar value={myUrgency[lvl]} max={Math.max(...Object.values(myUrgency), 1)}
                    color={lvl === 'critical' ? 'bg-red-500' : lvl === 'high' ? 'bg-orange-500' : lvl === 'medium' ? 'bg-yellow-500' : 'bg-slate-600'} />
                </div>
              ))}
            </div>
          </div>

          {myTokensIP > 0 && (
            <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Capacidad semanal</p>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden mb-2">
                <div className={cn('h-full rounded-full transition-all duration-700', myCapPct > 100 ? 'bg-red-500' : myCapPct > 70 ? 'bg-yellow-500' : 'bg-blue-500')}
                  style={{ width: `${Math.min(myCapPct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-neutral-600">
                <span>{myTokensIP}t en progreso</span><span>Cap. {currentUserCapacity}t</span>
              </div>
              {myTokensDone > 0 && <p className="text-xs text-green-400 mt-1.5">{myTokensDone}t completados · {tokensToHours(myTokensDone).toFixed(1)}h</p>}
            </div>
          )}

          {(myOverdue.length > 0 || noDate > 0 || noTokens > 0) && (
            <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Calidad del backlog</p>
              <div className="flex flex-col gap-2">
                {myOverdue.length > 0 && <InsightChip accent="red">{myOverdue.length} vencida{myOverdue.length !== 1 ? 's' : ''}</InsightChip>}
                {noDate > 0     && <InsightChip accent="yellow">{noDate} sin fecha límite</InsightChip>}
                {noTokens > 0   && <InsightChip accent="blue">{noTokens} sin estimación</InsightChip>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab({ teamTasks, teamActive, statusDist, priorityDist, teamDoneInPeriod,
  workload, overloadedN, periodLabel, initials, displayName }: {
  teamTasks: Task[]; teamActive: Task[]
  statusDist: { todo: number; in_progress: number; done: number }
  priorityDist: { critical: number; high: number; medium: number; low: number }
  teamDoneInPeriod: number; workload: { userId: string; activeTasks: number; inProgress: number; tokensIP: number; tokensDone: number; capacity: number; overdue: number }[]
  overloadedN: number; periodLabel?: string
  initials: (id: string) => string; displayName: (id: string) => string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl flex-wrap">
        <StatCell label="Total activas"    value={teamActive.length} />
        <Divider />
        <StatCell label="En progreso"      value={statusDist.in_progress} accent="yellow" />
        <Divider />
        <StatCell label="Completadas" sub={periodLabel} value={teamDoneInPeriod} accent="green" />
        <Divider />
        <StatCell label="Terminadas total" value={statusDist.done} accent="green" />
        {overloadedN > 0 && (<><Divider /><StatCell label="Sobrecargados" value={overloadedN} accent="red" /></>)}
      </div>

      <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/8">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Carga por persona</p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-xs text-neutral-700 uppercase tracking-wider border-b border-white/5">
              <th className="px-4 py-2 text-left">Persona</th>
              <th className="px-3 py-2 text-right">Activas</th>
              <th className="px-3 py-2 text-right">En progreso</th>
              <th className="px-3 py-2 text-right">Tokens IP</th>
              <th className="px-3 py-2 text-right">Tokens ✓</th>
              <th className="px-3 py-2 text-right">Vencidas</th>
              <th className="px-5 py-2 text-left w-36">Carga</th>
            </tr>
          </thead>
          <tbody>
            {workload.map(w => {
              const pct = w.capacity > 0 ? Math.round((w.tokensIP / w.capacity) * 100) : 0
              const isOver = pct > 100
              return (
                <tr key={w.userId} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">{initials(w.userId)}</div>
                      <span className="text-white">{displayName(w.userId)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-neutral-400 tabular-nums">{w.activeTasks}</td>
                  <td className="px-3 py-2.5 text-right text-yellow-400 tabular-nums">{w.inProgress}</td>
                  <td className="px-3 py-2.5 text-right text-neutral-400 tabular-nums">{w.tokensIP}</td>
                  <td className="px-3 py-2.5 text-right text-green-400 tabular-nums">{w.tokensDone}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {w.overdue > 0 ? <span className="text-red-400 font-semibold">{w.overdue}</span> : <span className="text-neutral-700">—</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-blue-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className={cn('text-xs tabular-nums w-8 text-right font-medium', isOver ? 'text-red-400' : 'text-neutral-600')}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Estado general</p>
          <div className="flex items-center gap-4">
            <DonutRing total={teamTasks.length} segments={[
              { color: '#3b82f6', value: statusDist.todo },
              { color: '#eab308', value: statusDist.in_progress },
              { color: '#22c55e', value: statusDist.done },
            ]} />
            <div className="flex flex-col gap-1.5 flex-1">
              {[{ label: 'Por hacer', value: statusDist.todo, color: 'bg-blue-500' },
                { label: 'En progreso', value: statusDist.in_progress, color: 'bg-yellow-500' },
                { label: 'Terminado', value: statusDist.done, color: 'bg-green-500' }]
                .map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.color)} />
                    <span className="text-xs text-neutral-500 flex-1">{s.label}</span>
                    <span className="text-xs text-neutral-300 tabular-nums font-medium">{s.value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Prioridad (activas)</p>
          <div className="flex flex-col gap-2">
            {(['critical', 'high', 'medium', 'low'] as const).map(p => (
              <div key={p} className="flex items-center gap-2">
                <span className={cn('text-xs px-1 py-px rounded font-semibold w-14 text-center shrink-0', PRIORITY_CONFIG[p].className)}>{PRIORITY_CONFIG[p].label}</span>
                <MiniBar value={priorityDist[p]} max={Math.max(...Object.values(priorityDist), 1)}
                  color={p === 'critical' ? 'bg-red-600' : p === 'high' ? 'bg-red-400' : p === 'medium' ? 'bg-yellow-400' : 'bg-green-500'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Clients Tab ───────────────────────────────────────────────────────────────

type ProjectStat = { project: string; tasks: Task[]; active: number; done: number; estimTokens: number; doneTokens: number; overdue: number }
type ClientStat  = { client: string; tasks: Task[]; projects: ProjectStat[]; active: number; done: number; estimTokens: number; doneTokens: number; overdue: number }

function ClientsTab({ clientStats, tasks, expandedClients, setExpandedClients, periodLabel }: {
  clientStats: ClientStat[]; tasks: Task[]
  expandedClients: Set<string>; setExpandedClients: (fn: (p: Set<string>) => Set<string>) => void
  periodLabel?: string
}) {
  const totalEstim = clientStats.reduce((s, c) => s + c.estimTokens, 0)
  const totalDone  = clientStats.reduce((s, c) => s + c.doneTokens,  0)
  const realClients = clientStats.filter(c => c.client !== '(Sin cliente)')
  const noClientCount = tasks.filter(t => t.status !== 'done' && !t.client).length

  function toggleClient(client: string) {
    setExpandedClients(prev => { const n = new Set(prev); n.has(client) ? n.delete(client) : n.add(client); return n })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl flex-wrap">
        <StatCell label="Clientes activos"    value={realClients.length} />
        <Divider />
        <StatCell label="H pendientes"        value={`${tokensToHours(totalEstim).toFixed(0)}h`} accent="yellow" />
        <Divider />
        <StatCell label="H completadas" sub={periodLabel} value={`${tokensToHours(totalDone).toFixed(0)}h`} accent="green" />
        <Divider />
        <StatCell label="Tareas con cliente"  value={realClients.reduce((s, c) => s + c.tasks.length, 0)} />
      </div>

      <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_52px_52px_1fr_88px] px-4 py-2 border-b border-white/8 text-xs text-neutral-600 uppercase tracking-wider">
          <span>Cliente / Proyecto</span>
          <span className="text-right">Activas</span>
          <span className="text-right">Hechas</span>
          <span className="text-right">Riesgo</span>
          <span className="pl-3">Horas pendiente / hecho</span>
          <span className="text-right pr-1">% completado</span>
        </div>

        {clientStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-sm text-neutral-500">No hay clientes registrados</p>
            <Link href="/dashboard/clients" className="text-xs text-blue-400 hover:text-blue-300">
              Registrar clientes →
            </Link>
          </div>
        ) : clientStats.map(cs => {
          const isExpanded  = expandedClients.has(cs.client)
          const total       = cs.active + cs.done
          const completePct = total > 0 ? Math.round((cs.done / total) * 100) : 0
          const hasProjects = cs.projects.length > 0

          return (
            <div key={cs.client}>
              {/* Client row */}
              <div
                onClick={() => hasProjects && toggleClient(cs.client)}
                className={cn(
                  'grid grid-cols-[1fr_56px_52px_52px_1fr_88px] px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] items-center',
                  hasProjects && 'cursor-pointer',
                  cs.client === '(Sin cliente)' && 'opacity-50',
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {hasProjects
                    ? (isExpanded ? <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-neutral-500 shrink-0" />)
                    : <span className="w-3 shrink-0" />}
                  <span className={cn('text-xs font-semibold truncate', cs.client === '(Sin cliente)' ? 'text-neutral-500' : 'text-white')}>{cs.client}</span>
                  <span className="text-xs text-neutral-600 shrink-0">({cs.tasks.length})</span>
                </div>
                <span className="text-right text-xs text-neutral-400 tabular-nums">{cs.active}</span>
                <span className="text-right text-xs text-green-400 tabular-nums">{cs.done}</span>
                <span className="text-right text-xs tabular-nums">
                  {cs.overdue > 0 ? <span className="text-red-400 font-semibold">{cs.overdue}</span> : <span className="text-neutral-700">—</span>}
                </span>
                <div className="pl-3"><HoursBar done={cs.doneTokens} total={cs.estimTokens + cs.doneTokens} /></div>
                <div className="flex items-center justify-end gap-1.5 pr-1">
                  <span className="text-xs tabular-nums text-neutral-400">{completePct}%</span>
                  <div className="w-12 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${completePct}%` }} />
                  </div>
                </div>
              </div>

              {/* Project sub-rows */}
              {isExpanded && cs.projects.map(ps => {
                const pTotal = ps.active + ps.done
                const pPct   = pTotal > 0 ? Math.round((ps.done / pTotal) * 100) : 0
                return (
                  <div key={ps.project}
                    className="grid grid-cols-[1fr_56px_52px_52px_1fr_88px] px-4 py-2 border-b border-white/[0.03] bg-white/[0.015] last:border-b-0 items-center">
                    <div className="flex items-center gap-2 pl-7 min-w-0">
                      <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                      <span className="text-xs text-neutral-400 truncate">{ps.project}</span>
                      <span className="text-xs text-neutral-600 shrink-0">({ps.tasks.length})</span>
                    </div>
                    <span className="text-right text-xs text-neutral-500 tabular-nums">{ps.active}</span>
                    <span className="text-right text-xs text-green-500/70 tabular-nums">{ps.done}</span>
                    <span className="text-right text-xs tabular-nums">
                      {ps.overdue > 0 ? <span className="text-red-400">{ps.overdue}</span> : <span className="text-neutral-700">—</span>}
                    </span>
                    <div className="pl-3"><HoursBar done={ps.doneTokens} total={ps.estimTokens + ps.doneTokens} /></div>
                    <div className="flex items-center justify-end gap-1.5 pr-1">
                      <span className="text-xs tabular-nums text-neutral-500">{pPct}%</span>
                      <div className="w-12 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full bg-green-500/60 transition-all" style={{ width: `${pPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {noClientCount > 0 && (
        <InsightChip accent="yellow">{noClientCount} tarea{noClientCount !== 1 ? 's' : ''} activa{noClientCount !== 1 ? 's' : ''} sin cliente asignado</InsightChip>
      )}
    </div>
  )
}

// ── Risks Tab ─────────────────────────────────────────────────────────────────

function RisksTab({ overdueAll, unassigned, highRisk, riskScore, now, displayName }: {
  overdueAll: Task[]; unassigned: Task[]; highRisk: Task[]
  riskScore: number; now: Date; displayName: (id: string) => string
}) {
  const riskColor = riskScore === 0 ? 'text-green-400' : riskScore < 30 ? 'text-yellow-400' : riskScore < 60 ? 'text-orange-400' : 'text-red-400'
  const riskLabel = riskScore === 0 ? 'Sin riesgos' : riskScore < 30 ? 'Bajo' : riskScore < 60 ? 'Moderado' : 'Alto'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5 px-5 py-3 bg-white/[0.025] border border-white/8 rounded-xl flex-wrap">
        <div>
          <p className="text-xs text-neutral-600 uppercase tracking-widest mb-0.5">Nivel de riesgo</p>
          <p className={cn('text-lg font-bold', riskColor)}>{riskLabel}</p>
        </div>
        <Divider />
        <StatCell label="Vencidas"              value={overdueAll.length} accent={overdueAll.length > 0 ? 'red' : 'white'} />
        <Divider />
        <StatCell label="Sin responsable"       value={unassigned.length} accent={unassigned.length > 0 ? 'orange' : 'white'} />
        <Divider />
        <StatCell label="Alto esfuerzo urgente" value={highRisk.length}   accent={highRisk.length > 0 ? 'yellow' : 'white'} />
      </div>

      {riskScore === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-2xl">✓</p>
          <p className="text-sm text-green-400 font-medium">Sin riesgos identificados</p>
          <p className="text-xs text-neutral-600">Todas las tareas tienen responsable y están dentro de plazo.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {overdueAll.length > 0 && (
            <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Tareas vencidas ({overdueAll.length})</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-xs text-red-400/50 uppercase tracking-wider border-b border-red-500/10">
                    <th className="px-4 py-2 text-left">Tarea</th>
                    <th className="px-3 py-2 text-left">Responsable</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-right">Días vencida</th>
                    <th className="px-3 py-2 text-left">Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueAll.slice(0, 8).map(t => {
                    const late = Math.round((now.getTime() - new Date(t.due_date!).getTime()) / 86_400_000)
                    return (
                      <tr key={t.id} className="border-b border-red-500/[0.08] last:border-0 hover:bg-red-500/[0.03]">
                        <td className="px-4 py-2.5 text-white max-w-[200px] truncate">{t.title}</td>
                        <td className="px-3 py-2.5 text-neutral-500">{displayName(t.assigned_to ?? t.user_id)}</td>
                        <td className="px-3 py-2.5">
                          {t.client && <span className="text-xs px-1 py-px rounded bg-teal-500/15 text-teal-400">{t.client}{t.project ? '/' + t.project : ''}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right"><span className="text-red-400 font-semibold tabular-nums">+{late}d</span></td>
                        <td className="px-3 py-2.5"><span className={cn('text-xs px-1 py-px rounded font-semibold', PRIORITY_CONFIG[t.priority].className)}>{PRIORITY_CONFIG[t.priority].label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {unassigned.length > 0 && (
            <div className="bg-orange-500/[0.04] border border-orange-500/15 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-orange-500/10">
                <User className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">Sin responsable ({unassigned.length})</p>
              </div>
              <div className="flex flex-col">
                {unassigned.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2 border-b border-orange-500/[0.08] last:border-0">
                    <span className={cn('text-xs px-1 py-px rounded font-semibold shrink-0', PRIORITY_CONFIG[t.priority].className)}>{PRIORITY_CONFIG[t.priority].label}</span>
                    <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                    {t.client && <span className="text-xs text-teal-400 shrink-0">{t.client}</span>}
                    {t.due_date && <span className="text-xs text-neutral-600 shrink-0">{new Date(t.due_date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-orange-500/10">
                <Link href="/dashboard" className="text-xs text-blue-400 hover:text-blue-300">Asignar en el board →</Link>
              </div>
            </div>
          )}

          {highRisk.length > 0 && (
            <div className="bg-yellow-500/[0.04] border border-yellow-500/15 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-yellow-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Alto esfuerzo · Plazo ≤3 días ({highRisk.length})</p>
              </div>
              <div className="flex flex-col">
                {highRisk.map(t => {
                  const d = Math.round((new Date(t.due_date!).getTime() - now.getTime()) / 86_400_000)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2 border-b border-yellow-500/[0.08] last:border-0">
                      <span className="text-xs px-1 py-px rounded bg-yellow-500/20 text-yellow-400 shrink-0 tabular-nums">{d}d</span>
                      <span className="text-xs text-white flex-1 truncate">{t.title}</span>
                      {t.client && <span className="text-xs text-teal-400 shrink-0">{t.client}</span>}
                      <span className="text-xs text-neutral-500 shrink-0">{t.effort_tokens}t · {displayName(t.assigned_to ?? t.user_id)}</span>
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
}
