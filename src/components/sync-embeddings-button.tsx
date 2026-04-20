'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { embedAllUserTasks } from '@/actions/embeddings'

type State = 'idle' | 'loading' | 'done' | 'error'

export function SyncEmbeddingsButton() {
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null)

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
        {result.ok} tareas sincronizadas
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
