'use client'

import { useState, useTransition } from 'react'
import { X, Save, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateTask, updateTaskStatus, deleteTask } from '@/actions/tasks'
import {
  type Task, type UserRole, type TaskPriority, type TaskStatus, type ImpactLevel,
  PRIORITY_CONFIG, IMPACT_CONFIG, KANBAN_COLUMNS, URGENCY_CONFIG, ROLE_CONFIG,
  tokensToHours, getUrgency,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { type ClientOption } from '@/actions/clients'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface TaskDetailDrawerProps {
  task: Task | null
  role: UserRole
  users: UserOption[]
  clients?: ClientOption[]
  currentUserId: string
  onClose: () => void
  onChanged: () => void
}

// ── Section block header ──────────────────────────────────────────────────────

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-600 border-b border-white/5 pb-1">
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  )
}

function ReadValue({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-neutral-300">{children}</p>
}

// ── User display helper ───────────────────────────────────────────────────────

function UserBadge({ userId, users, label }: { userId: string | null; users: UserOption[]; label: string }) {
  if (!userId) return <ReadValue>—</ReadValue>
  const u = users.find((x) => x.id === userId)
  const name = u?.full_name ?? userId.slice(0, 8)
  const roleConfig = u ? ROLE_CONFIG[u.role] : null
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-white/10 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <p className="text-xs text-white">{name}</p>
        {roleConfig && (
          <span className={cn('text-[9px] px-1 rounded', roleConfig.className)}>
            {roleConfig.label}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailDrawer({
  task, role, users, clients = [], currentUserId, onClose, onChanged,
}: TaskDetailDrawerProps) {
  const canEdit =
    role === 'admin_system' ||
    role === 'leader' ||
    task?.assigned_to   === currentUserId ||
    task?.task_owner_id === currentUserId ||
    task?.user_id       === currentUserId

  const isLeaderOrAdmin = role === 'leader' || role === 'admin_system'
  const isAdmin         = role === 'admin_system'

  const [title, setTitle]               = useState(task?.title ?? '')
  const [description, setDescription]   = useState(task?.description ?? '')
  const [priority, setPriority]         = useState<TaskPriority>(task?.priority ?? 'medium')
  const [status, setStatus]             = useState<TaskStatus>(task?.status ?? 'todo')
  const [impact, setImpact]             = useState<ImpactLevel | ''>(task?.impact_level ?? '')
  const [tokens, setTokens]             = useState<string>(task?.effort_tokens?.toString() ?? '')
  const [dueDate, setDueDate]           = useState(task?.due_date?.slice(0, 10) ?? '')
  const [estStart, setEstStart]         = useState(task?.estimated_start_date?.slice(0, 10) ?? '')
  const [assignedTo, setAssignedTo]     = useState(task?.assigned_to ?? '')
  const [taskOwner, setTaskOwner]       = useState(task?.task_owner_id ?? '')
  const [client, setClient]             = useState(task?.client ?? '')
  const [project, setProject]           = useState(task?.project ?? '')
  const [isPending, startTransition]    = useTransition()
  const [error, setError]               = useState<string | null>(null)

  if (!task) return null

  const urgency       = getUrgency({ ...task, priority, due_date: dueDate || task.due_date, effort_tokens: tokens ? parseInt(tokens) : task.effort_tokens })
  const urgencyConfig = URGENCY_CONFIG[urgency]

  function handleSave() {
    if (!task) return
    startTransition(async () => {
      const statusChanged = status !== task.status
      if (statusChanged) await updateTaskStatus(task.id, status)

      const result = await updateTask(task.id, {
        title:               title.trim() || task.title,
        description:         description.trim() || null,
        priority,
        impact_level:        impact || null,
        effort_tokens:       tokens ? parseInt(tokens, 10) : null,
        due_date:            dueDate || null,
        estimated_start_date: estStart || null,
        assigned_to:         isLeaderOrAdmin ? assignedTo || null : undefined,
        task_owner_id:       isLeaderOrAdmin ? taskOwner  || null : undefined,
        client:              client.trim() || null,
        project:             project.trim() || null,
      })
      if (result.error) { setError(result.error); return }
      onChanged()
      onClose()
    })
  }

  async function handleDelete() {
    if (!task) return
    if (!confirm('¿Eliminar esta tarea?')) return
    startTransition(async () => {
      const result = await deleteTask(task.id)
      if (result.error) { setError(result.error); return }
      onChanged()
      onClose()
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[440px] max-w-[95vw] bg-[#0d0d1a] border-l border-white/10 shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Detalle de tarea</span>
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded',
              urgencyConfig.className,
            )}>
              {urgencyConfig.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

          {/* ── 1. Información base ─────────────────────────────────────── */}
          <Block title="Información base">
            <Field label="Título">
              {canEdit ? (
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              ) : (
                <p className="text-sm text-white">{task.title}</p>
              )}
            </Field>

            <Field label="Descripción">
              {canEdit ? (
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Descripción opcional..."
                />
              ) : (
                <p className="text-xs text-neutral-400">{task.description ?? '—'}</p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente">
                {canEdit && clients.length > 0 ? (() => {
                  const allOpts = clients.filter(c => c.status === 'active')
                  const hasExtra = client && !allOpts.find(c => c.name === client)
                  return (
                    <Select value={client || '__none__'} onValueChange={val => { setClient(val === '__none__' ? '' : val); setProject('') }}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                        <SelectItem value="__none__" className="text-neutral-500 focus:bg-white/10 text-xs">Sin cliente</SelectItem>
                        {hasExtra && <SelectItem value={client} className="text-teal-400 focus:bg-white/10 text-xs">{client}</SelectItem>}
                        {allOpts.map(c => (
                          <SelectItem key={c.id} value={c.name} className="text-white focus:bg-white/10 text-xs">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                })() : canEdit ? (
                  <Input
                    value={client}
                    onChange={e => setClient(e.target.value)}
                    placeholder="—"
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                ) : (
                  <ReadValue>{task.client ?? '—'}</ReadValue>
                )}
              </Field>
              <Field label="Proyecto">
                {canEdit && clients.length > 0 ? (() => {
                  const selectedClient = clients.find(c => c.name === client)
                  const projs = selectedClient?.projects.filter(p => p.status === 'active') ?? []
                  const hasExtra = project && !projs.find(p => p.name === project)
                  return projs.length > 0 || hasExtra ? (
                    <Select value={project || '__none__'} onValueChange={val => setProject(val === '__none__' ? '' : val)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                        <SelectItem value="__none__" className="text-neutral-500 focus:bg-white/10 text-xs">Sin proyecto</SelectItem>
                        {hasExtra && <SelectItem value={project} className="text-indigo-400 focus:bg-white/10 text-xs">{project}</SelectItem>}
                        {projs.map(p => (
                          <SelectItem key={p.id} value={p.name} className="text-white focus:bg-white/10 text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={project}
                      onChange={e => setProject(e.target.value)}
                      placeholder={client ? '—' : 'Selecciona cliente'}
                      disabled={!client}
                      className="bg-white/5 border-white/10 text-white text-xs h-8 disabled:opacity-40"
                    />
                  )
                })() : canEdit ? (
                  <Input
                    value={project}
                    onChange={e => setProject(e.target.value)}
                    placeholder="—"
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                ) : (
                  <ReadValue>{task.project ?? '—'}</ReadValue>
                )}
              </Field>
            </div>
          </Block>

          {/* ── 2. Clasificación ─────────────────────────────────────────── */}
          <Block title="Clasificación">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estado">
                {canEdit ? (
                  <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                      {KANBAN_COLUMNS.map(col => (
                        <SelectItem key={col.status} value={col.status} className="text-white focus:bg-white/10 text-xs">
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <ReadValue>{KANBAN_COLUMNS.find(c => c.status === status)?.label}</ReadValue>
                )}
              </Field>

              <Field label="Prioridad">
                {canEdit ? (
                  <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                      {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, { label: string }][]).map(([v, { label }]) => (
                        <SelectItem key={v} value={v} className="text-white focus:bg-white/10 text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', PRIORITY_CONFIG[priority].className)}>
                    {PRIORITY_CONFIG[priority].label}
                  </span>
                )}
              </Field>

              <Field label="Impacto">
                {canEdit ? (
                  <Select value={impact} onValueChange={v => setImpact(v as ImpactLevel)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                      {(Object.entries(IMPACT_CONFIG) as [ImpactLevel, { label: string }][]).map(([v, { label }]) => (
                        <SelectItem key={v} value={v} className="text-white focus:bg-white/10 text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <ReadValue>{impact ? IMPACT_CONFIG[impact as ImpactLevel].label : '—'}</ReadValue>
                )}
              </Field>

              <Field label="Tokens (1=15min)">
                {canEdit ? (
                  <Input
                    type="number"
                    min={0}
                    value={tokens}
                    onChange={e => setTokens(e.target.value)}
                    placeholder="0"
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                ) : (
                  <ReadValue>
                    {task.effort_tokens != null
                      ? `${task.effort_tokens} tokens (${tokensToHours(task.effort_tokens).toFixed(1)}h)`
                      : '—'}
                  </ReadValue>
                )}
              </Field>
            </div>

            {/* Urgency (read-only computed) */}
            <Field label="Urgencia calculada">
              <span className={cn('text-xs px-1.5 py-0.5 rounded w-fit', urgencyConfig.className)}>
                {urgencyConfig.label}
              </span>
            </Field>
          </Block>

          {/* ── 3. Responsables ──────────────────────────────────────────── */}
          <Block title="Responsables">
            {/* Created by — always read-only */}
            <Field label="Creado por">
              <UserBadge userId={task.user_id} users={users} label="Creado por" />
            </Field>

            {/* Task owner — editable for leader/admin */}
            <Field label="Propietario de tarea">
              {isLeaderOrAdmin && users.length > 0 ? (
                <Select value={taskOwner} onValueChange={setTaskOwner}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-white focus:bg-white/10 text-xs">
                        {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId && ' (yo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <UserBadge userId={task.task_owner_id} users={users} label="Propietario" />
              )}
            </Field>

            {/* Execution owner — editable for leader/admin */}
            <Field label="Responsable de ejecución">
              {isLeaderOrAdmin && users.length > 0 ? (
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-white focus:bg-white/10 text-xs">
                        {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId && ' (yo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <UserBadge userId={task.assigned_to} users={users} label="Ejecución" />
              )}
            </Field>
          </Block>

          {/* ── 4. Tiempo ────────────────────────────────────────────────── */}
          <Block title="Tiempo">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio estimado">
                {canEdit ? (
                  <Input
                    type="date"
                    value={estStart}
                    onChange={e => setEstStart(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                ) : (
                  <ReadValue>
                    {task.estimated_start_date
                      ? new Date(task.estimated_start_date).toLocaleDateString('es')
                      : '—'}
                  </ReadValue>
                )}
              </Field>

              <Field label="Fecha límite">
                {canEdit ? (
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-xs h-8"
                  />
                ) : (
                  <ReadValue>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('es') : '—'}
                  </ReadValue>
                )}
              </Field>

              {task.started_at && (
                <Field label="Iniciado">
                  <p className="text-[10px] text-neutral-500">
                    {new Date(task.started_at).toLocaleString('es')}
                  </p>
                </Field>
              )}

              {task.completed_at && (
                <Field label="Completado">
                  <p className="text-[10px] text-neutral-500">
                    {new Date(task.completed_at).toLocaleString('es')}
                  </p>
                </Field>
              )}
            </div>
          </Block>

          {/* ── 5. Auditoría ─────────────────────────────────────────────── */}
          <Block title="Auditoría">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Creado">
                <p className="text-[10px] text-neutral-600">
                  {new Date(task.created_at).toLocaleString('es')}
                </p>
              </Field>
              <Field label="Actualizado">
                <p className="text-[10px] text-neutral-600">
                  {new Date(task.updated_at).toLocaleString('es')}
                </p>
              </Field>
            </div>
          </Block>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between gap-2 shrink-0">
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors text-white text-xs font-medium px-4 py-2 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
