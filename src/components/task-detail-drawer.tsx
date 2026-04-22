'use client'

import { useState, useTransition } from 'react'
import { X, Save, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateTask, updateTaskStatus, deleteTask } from '@/actions/tasks'
import {
  type Task, type UserRole, type TaskPriority, type TaskStatus, type ImpactLevel,
  PRIORITY_CONFIG, IMPACT_CONFIG, KANBAN_COLUMNS, tokensToHours,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface TaskDetailDrawerProps {
  task: Task | null
  role: UserRole
  users: UserOption[]
  currentUserId: string
  onClose: () => void
  onChanged: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  )
}

export function TaskDetailDrawer({
  task, role, users, currentUserId, onClose, onChanged,
}: TaskDetailDrawerProps) {
  const canEdit =
    role === 'admin_system' ||
    role === 'leader' ||
    task?.assigned_to === currentUserId ||
    task?.user_id === currentUserId

  const [title, setTitle]           = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority]     = useState<TaskPriority>(task?.priority ?? 'medium')
  const [status, setStatus]         = useState<TaskStatus>(task?.status ?? 'todo')
  const [impact, setImpact]         = useState<ImpactLevel | ''>(task?.impact_level ?? '')
  const [tokens, setTokens]         = useState<string>(task?.effort_tokens?.toString() ?? '')
  const [dueDate, setDueDate]       = useState(task?.due_date?.slice(0, 10) ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)

  if (!task) return null

  function handleSave() {
    if (!task) return
    startTransition(async () => {
      const statusChanged = status !== task.status
      if (statusChanged) await updateTaskStatus(task.id, status)

      const result = await updateTask(task.id, {
        title:        title.trim() || task.title,
        description:  description.trim() || null,
        priority,
        impact_level: impact || null,
        effort_tokens: tokens ? parseInt(tokens, 10) : null,
        due_date:     dueDate || null,
        assigned_to:  (role === 'leader' || role === 'admin_system') ? assignedTo || null : undefined,
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

  const isAdmin = role === 'admin_system'
  const isLeaderOrAdmin = role === 'leader' || role === 'admin_system'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[95vw] bg-[#0d0d1a] border-l border-white/10 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <span className="text-sm font-medium text-white">Detalle de tarea</span>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Title */}
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

          {/* Description */}
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

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              {canEdit ? (
                <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                    {KANBAN_COLUMNS.map(col => (
                      <SelectItem key={col.status} value={col.status} className="text-white focus:bg-white/10 text-xs">
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-neutral-300">{KANBAN_COLUMNS.find(c => c.status === status)?.label}</p>
              )}
            </Field>

            <Field label="Prioridad">
              {canEdit ? (
                <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
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
          </div>

          {/* Impact + Tokens row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Impacto">
              {canEdit ? (
                <Select value={impact} onValueChange={v => setImpact(v as ImpactLevel)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                    {(Object.entries(IMPACT_CONFIG) as [ImpactLevel, { label: string }][]).map(([v, { label }]) => (
                      <SelectItem key={v} value={v} className="text-white focus:bg-white/10 text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-neutral-300">{impact ? IMPACT_CONFIG[impact as ImpactLevel].label : '—'}</p>
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
                  className="bg-white/5 border-white/10 text-white text-xs"
                />
              ) : (
                <p className="text-xs text-neutral-300">
                  {task.effort_tokens != null
                    ? `${task.effort_tokens} tokens (${tokensToHours(task.effort_tokens).toFixed(1)}h)`
                    : '—'}
                </p>
              )}
            </Field>
          </div>

          {/* Due date */}
          <Field label="Fecha límite">
            {canEdit ? (
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs"
              />
            ) : (
              <p className="text-xs text-neutral-300">{task.due_date ? new Date(task.due_date).toLocaleDateString('es') : '—'}</p>
            )}
          </Field>

          {/* Assigned to — leader/admin only */}
          {isLeaderOrAdmin && (
            <Field label="Asignado a">
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-white focus:bg-white/10 text-xs">
                      {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId && ' (yo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
            <Field label="Creado">
              <p className="text-[10px] text-neutral-600">{new Date(task.created_at).toLocaleString('es')}</p>
            </Field>
            <Field label="Actualizado">
              <p className="text-[10px] text-neutral-600">{new Date(task.updated_at).toLocaleString('es')}</p>
            </Field>
            {task.started_at && (
              <Field label="Iniciado">
                <p className="text-[10px] text-neutral-600">{new Date(task.started_at).toLocaleString('es')}</p>
              </Field>
            )}
            {task.completed_at && (
              <Field label="Completado">
                <p className="text-[10px] text-neutral-600">{new Date(task.completed_at).toLocaleString('es')}</p>
              </Field>
            )}
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}
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
