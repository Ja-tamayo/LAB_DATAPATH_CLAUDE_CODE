'use client'

import { useState, useTransition } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2, ToggleLeft, ToggleRight, FolderPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createClientRecord, createProjectRecord,
  updateClientStatus, updateProjectStatus,
  deleteClientRecord, deleteProjectRecord,
} from '@/actions/clients'
import { type ClientOption } from '@/actions/clients'

interface Props {
  initialClients: ClientOption[]
  isAdmin:        boolean
  isPrivileged:   boolean
}

export function ClientsManager({ initialClients, isAdmin, isPrivileged }: Props) {
  const [clients,         setClients]         = useState<ClientOption[]>(initialClients)
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set())
  const [newClientName,   setNewClientName]   = useState('')
  const [newProjectNames, setNewProjectNames] = useState<Record<string, string>>({})
  const [addingProject,   setAddingProject]   = useState<string | null>(null)
  const [error,           setError]           = useState<string | null>(null)
  const [isPending,       startTransition]    = useTransition()

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newClientName.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await createClientRecord(trimmed)
        if (res.error) { setError(res.error); return }
        setClients(prev => [...prev, { id: res.id!, name: trimmed, status: 'active' as const, projects: [] }].sort((a, b) => a.name.localeCompare(b.name)))
        setNewClientName('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al crear cliente')
      }
    })
  }

  async function handleToggleClient(id: string, current: 'active' | 'inactive') {
    const next: 'active' | 'inactive' = current === 'active' ? 'inactive' : 'active'
    startTransition(async () => {
      const res = await updateClientStatus(id, next)
      if (res.error) { setError(res.error); return }
      setClients(prev => prev.map(c => c.id === id ? { ...c, status: next } : c))
    })
  }

  async function handleDeleteClient(id: string, name: string) {
    if (!confirm(`¿Eliminar cliente "${name}" y todos sus proyectos?`)) return
    startTransition(async () => {
      const res = await deleteClientRecord(id)
      if (res.error) { setError(res.error); return }
      setClients(prev => prev.filter(c => c.id !== id))
    })
  }

  async function handleAddProject(clientId: string, e: React.FormEvent) {
    e.preventDefault()
    const name = (newProjectNames[clientId] ?? '').trim()
    if (!name) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await createProjectRecord(clientId, name)
        if (res.error) { setError(res.error); return }
        setClients(prev => prev.map(c => c.id === clientId
          ? { ...c, projects: [...c.projects, { id: res.id!, name, status: 'active' as const }].sort((a, b) => a.name.localeCompare(b.name)) }
          : c,
        ))
        setNewProjectNames(prev => ({ ...prev, [clientId]: '' }))
        setAddingProject(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al crear proyecto')
      }
    })
  }

  async function handleToggleProject(clientId: string, projId: string, current: 'active' | 'inactive') {
    const next: 'active' | 'inactive' = current === 'active' ? 'inactive' : 'active'
    startTransition(async () => {
      const res = await updateProjectStatus(projId, next)
      if (res.error) { setError(res.error); return }
      setClients(prev => prev.map(c => c.id === clientId
        ? { ...c, projects: c.projects.map(p => p.id === projId ? { ...p, status: next } : p) }
        : c,
      ))
    })
  }

  async function handleDeleteProject(clientId: string, projId: string, name: string) {
    if (!confirm(`¿Eliminar proyecto "${name}"?`)) return
    startTransition(async () => {
      const res = await deleteProjectRecord(projId)
      if (res.error) { setError(res.error); return }
      setClients(prev => prev.map(c => c.id === clientId
        ? { ...c, projects: c.projects.filter(p => p.id !== projId) }
        : c,
      ))
    })
  }

  const activeCount   = clients.filter(c => c.status === 'active').length
  const inactiveCount = clients.filter(c => c.status === 'inactive').length
  const projectCount  = clients.reduce((s, c) => s + c.projects.filter(p => p.status === 'active').length, 0)

  return (
    <div className="flex flex-col gap-4">

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-white/8 bg-white/[0.025] px-5 py-4">
        <div>
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.18em] mb-0.5">Clientes activos</p>
          <p className="text-xl font-bold text-white tabular-nums">{activeCount}</p>
        </div>
        <span className="w-px h-6 bg-white/8" />
        <div>
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.18em] mb-0.5">Proyectos activos</p>
          <p className="text-xl font-bold text-blue-400 tabular-nums">{projectCount}</p>
        </div>
        {inactiveCount > 0 && (
          <>
            <span className="w-px h-6 bg-white/8" />
            <div>
              <p className="text-[10px] text-neutral-600 uppercase tracking-[0.18em] mb-0.5">Inactivos</p>
              <p className="text-xl font-bold text-neutral-600 tabular-nums">{inactiveCount}</p>
            </div>
          </>
        )}
      </div>

      {/* Global error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3">
          <span className="text-red-400 font-bold text-base shrink-0 leading-none mt-px">!</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400 mb-0.5">Error</p>
            <p className="text-xs text-red-300 leading-relaxed break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-xs px-1 shrink-0">✕</button>
        </div>
      )}

      {/* Add client form */}
      {isPrivileged && (
        <form onSubmit={handleAddClient} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Nombre del nuevo cliente..."
            value={newClientName}
            onChange={e => { setNewClientName(e.target.value); setError(null) }}
            className="h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={isPending || !newClientName.trim()}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {isPending ? 'Guardando…' : 'Agregar cliente'}
          </button>
        </form>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-12 text-neutral-600 text-sm">
          No hay clientes registrados.<br />
          <span className="text-xs">Agrega el primero con el formulario de arriba.</span>
        </div>
      ) : (
        <div className="bg-white/[0.025] border border-white/8 rounded-xl overflow-hidden">
          {clients.map((client, ci) => {
            const isExpanded  = expanded.has(client.id)
            const isInactive  = client.status === 'inactive'
            const activeProjN = client.projects.filter(p => p.status === 'active').length

            return (
              <div key={client.id} className={cn('border-b border-white/5 last:border-0', isInactive && 'opacity-50')}>

                {/* Client row */}
                <div className="flex items-center gap-2 px-4 py-3 hover:bg-white/[0.02]">
                  <button
                    onClick={() => toggle(client.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {client.projects.length > 0
                      ? (isExpanded
                          ? <ChevronDown  className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          : <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />)
                      : <span className="w-3.5 shrink-0" />
                    }
                    <span className="text-sm font-medium text-white truncate">{client.name}</span>
                    {activeProjN > 0 && (
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {activeProjN} proyecto{activeProjN !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                      client.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-neutral-700/40 text-neutral-500',
                    )}>
                      {client.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {isPrivileged && (
                      <button
                        onClick={() => { setAddingProject(addingProject === client.id ? null : client.id); setExpanded(prev => { const n = new Set(prev); n.add(client.id); return n }) }}
                        title="Agregar proyecto"
                        className="p-1.5 text-neutral-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isPrivileged && (
                      <button
                        onClick={() => handleToggleClient(client.id, client.status)}
                        title={client.status === 'active' ? 'Desactivar' : 'Activar'}
                        className="p-1.5 text-neutral-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-colors"
                      >
                        {client.status === 'active'
                          ? <ToggleRight className="w-3.5 h-3.5 text-green-400" />
                          : <ToggleLeft  className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isPrivileged && (
                      <button
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        title="Eliminar cliente"
                        className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Add project form */}
                {addingProject === client.id && (
                  <form
                    onSubmit={(e) => handleAddProject(client.id, e)}
                    className="flex items-center gap-2 px-4 pb-2 pl-10"
                  >
                    <input
                      type="text"
                      placeholder="Nombre del proyecto..."
                      value={newProjectNames[client.id] ?? ''}
                      onChange={e => setNewProjectNames(prev => ({ ...prev, [client.id]: e.target.value }))}
                      autoFocus
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg"
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingProject(null)}
                      className="text-xs text-neutral-500 hover:text-white px-2 py-1.5"
                    >
                      Cancelar
                    </button>
                  </form>
                )}

                {/* Projects */}
                {isExpanded && client.projects.map(proj => (
                  <div
                    key={proj.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 pl-10 border-t border-white/[0.03] bg-white/[0.012] hover:bg-white/[0.025]',
                      proj.status === 'inactive' && 'opacity-50',
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span className="text-xs text-neutral-300 flex-1 truncate">{proj.name}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                      proj.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-neutral-700/40 text-neutral-600',
                    )}>
                      {proj.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                    {isPrivileged && (
                      <button
                        onClick={() => handleToggleProject(client.id, proj.id, proj.status)}
                        title={proj.status === 'active' ? 'Desactivar' : 'Activar'}
                        className="p-1 text-neutral-600 hover:text-yellow-400 rounded-md transition-colors"
                      >
                        {proj.status === 'active'
                          ? <ToggleRight className="w-3.5 h-3.5 text-green-500/70" />
                          : <ToggleLeft  className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isPrivileged && (
                      <button
                        onClick={() => handleDeleteProject(client.id, proj.id, proj.name)}
                        title="Eliminar proyecto"
                        className="p-1 text-neutral-700 hover:text-red-400 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
