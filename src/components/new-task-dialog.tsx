'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createTask } from '@/actions/tasks'
import { PRIORITY_CONFIG, type TaskPriority, type UserRole } from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface NewTaskDialogProps {
  role?: UserRole
  users?: UserOption[]   // available for leader/admin to assign
  currentUserId?: string
}

export function NewTaskDialog({ role = 'collaborator', users = [], currentUserId }: NewTaskDialogProps) {
  const [open, setOpen]             = useState(false)
  const [title, setTitle]           = useState('')
  const [priority, setPriority]     = useState<TaskPriority>('medium')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>(currentUserId ?? '')
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canAssign = role === 'leader' || role === 'admin_system'

  function reset() {
    setTitle('')
    setPriority('medium')
    setDescription('')
    setAssignedTo(currentUserId ?? '')
    setError(null)
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('El título es requerido'); return }
    setError(null)
    startTransition(async () => {
      const result = await createTask(
        title.trim(),
        priority,
        description.trim() || undefined,
        canAssign ? assignedTo || undefined : undefined,
      )
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Nueva tarea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Título *</label>
            <Input
              type="text"
              placeholder="Escribe el título de la tarea..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
              autoFocus
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Prioridad</label>
            <Select value={priority} onValueChange={val => setPriority(val as TaskPriority)}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(
                  ([value, { label }]) => (
                    <SelectItem key={value} value={value} className="text-white focus:bg-white/10">
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned to — only for leader/admin */}
          {canAssign && users.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400">Asignar a</label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-white focus:bg-white/10">
                      {u.full_name ?? u.id.slice(0, 8)}
                      {u.id === currentUserId && ' (yo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Descripción (opcional)</label>
            <Input
              type="text"
              placeholder="Describe la tarea..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter className="bg-transparent border-none pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              {isPending ? 'Creando...' : 'Crear tarea'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
