'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { embedAllUserTasks } from '@/actions/embeddings'
import { type UserRole } from '@/types/tasks'

type SyncState = 'idle' | 'loading' | 'done' | 'error'

interface SyncEmbeddingsButtonProps {
  role?: UserRole
}

export function SyncEmbeddingsButton({ role }: SyncEmbeddingsButtonProps) {
  const [state, setState]   = useState<SyncState>('idle')
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null)

  // Only admin_system can sync embeddings
  if (role !== 'admin_system') return null

  async function handleSync() {
    setState('loading')
    try {
      const res = await embedAllUserTasks()
      setResult(res)
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done' && result) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {result.ok} sincronizadas
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        Error al sincronizar
      </span>
    )
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-400 transition-colors disabled:opacity-50"
      title="Sincronizar tareas con el índice RAG"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} />
      {state === 'loading' ? 'Sincronizando…' : 'Sincronizar RAG'}
    </button>
  )
}
