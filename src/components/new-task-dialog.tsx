'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createTask } from '@/actions/tasks'
import {
  PRIORITY_CONFIG, IMPACT_CONFIG,
  type TaskPriority, type ImpactLevel, type UserRole,
} from '@/types/tasks'
import { type UserOption } from '@/actions/users'
import { type ClientOption } from '@/actions/clients'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface NewTaskDialogProps {
  role?: UserRole
  users?: UserOption[]
  clients?: ClientOption[]
  currentUserId?: string
}

export function NewTaskDialog({ role = 'collaborator', users = [], clients = [], currentUserId }: NewTaskDialogProps) {
  const [open, setOpen]               = useState(false)
  const [title, setTitle]             = useState('')
  const [priority, setPriority]       = useState<TaskPriority>('medium')
  const [impact, setImpact]           = useState<ImpactLevel | ''>('')
  const [description, setDescription] = useState('')
  const [tokens, setTokens]           = useState('')
  const [dueDate, setDueDate]         = useState('')
  const [estStart, setEstStart]       = useState('')
  const [assignedTo, setAssignedTo]   = useState<string>(currentUserId ?? '')
  const [taskOwner, setTaskOwner]     = useState<string>(currentUserId ?? '')
  const [client, setClient]           = useState('')
  const [project, setProject]         = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const canAssign = role === 'leader' || role === 'admin_system'

  function reset() {
    setTitle(''); setPriority('medium'); setImpact(''); setDescription('')
    setTokens(''); setDueDate(''); setEstStart(''); setClient(''); setProject('')
    setAssignedTo(currentUserId ?? '')
    setTaskOwner(currentUserId ?? '')
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
        canAssign ? taskOwner  || undefined : undefined,
        client.trim() || undefined,
        project.trim() || undefined,
        impact || null,
        tokens ? parseInt(tokens, 10) : null,
        dueDate || null,
        estStart || null,
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
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus className="w-3.5 h-3.5" />
          Nueva tarea
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">Nueva tarea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Título *</label>
            <Input
              type="text"
              placeholder="Escribe el título de la tarea..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 text-sm"
              autoFocus
            />
          </div>

          {/* Priority + Impact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Prioridad</label>
              <Select value={priority} onValueChange={val => setPriority(val as TaskPriority)}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                  {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(
                    ([value, { label }]) => (
                      <SelectItem key={value} value={value} className="text-white focus:bg-white/10 text-xs">
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Impacto</label>
              <Select value={impact} onValueChange={val => setImpact(val as ImpactLevel)}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                  {(Object.entries(IMPACT_CONFIG) as [ImpactLevel, typeof IMPACT_CONFIG[ImpactLevel]][]).map(
                    ([value, { label }]) => (
                      <SelectItem key={value} value={value} className="text-white focus:bg-white/10 text-xs">
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tokens + dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Tokens (1=15min)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={tokens}
                onChange={e => setTokens(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 text-xs h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Inicio estimado</label>
              <Input
                type="date"
                value={estStart}
                onChange={e => setEstStart(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Fecha límite</label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs h-8"
              />
            </div>
          </div>

          {/* Client + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Cliente</label>
              {clients.length > 0 ? (
                <Select value={client} onValueChange={val => { setClient(val === '__none__' ? '' : val); setProject('') }}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="Sin cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                    <SelectItem value="__none__" className="text-neutral-500 focus:bg-white/10 text-xs">Sin cliente</SelectItem>
                    {clients.filter(c => c.status === 'active').map(c => (
                      <SelectItem key={c.id} value={c.name} className="text-white focus:bg-white/10 text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  placeholder="Opcional"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 text-xs h-8"
                />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Proyecto</label>
              {clients.length > 0 ? (() => {
                const selectedClient = clients.find(c => c.name === client)
                const projs = selectedClient?.projects.filter(p => p.status === 'active') ?? []
                return projs.length > 0 ? (
                  <Select value={project} onValueChange={val => setProject(val === '__none__' ? '' : val)}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                      <SelectValue placeholder="Sin proyecto" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                      <SelectItem value="__none__" className="text-neutral-500 focus:bg-white/10 text-xs">Sin proyecto</SelectItem>
                      {projs.map(p => (
                        <SelectItem key={p.id} value={p.name} className="text-white focus:bg-white/10 text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    placeholder={client ? 'Sin proyectos registrados' : 'Selecciona cliente primero'}
                    value={project}
                    onChange={e => setProject(e.target.value)}
                    disabled={!client}
                    className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 text-xs h-8 disabled:opacity-40"
                  />
                )
              })() : (
                <Input
                  type="text"
                  placeholder="Opcional"
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 text-xs h-8"
                />
              )}
            </div>
          </div>

          {/* Responsible fields — leader/admin only */}
          {canAssign && users.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Propietario</label>
                <Select value={taskOwner} onValueChange={setTaskOwner}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-white focus:bg-white/10 text-xs">
                        {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId && ' (yo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Responsable ejecución</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-8">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white z-[60]">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-white focus:bg-white/10 text-xs">
                        {u.full_name ?? u.id.slice(0, 8)}{u.id === currentUserId && ' (yo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Descripción (opcional)</label>
            <textarea
              placeholder="Describe la tarea..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter className="bg-transparent border-none pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors text-white text-xs font-medium px-4 py-2 rounded-lg"
            >
              {isPending ? 'Creando...' : 'Crear tarea'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
