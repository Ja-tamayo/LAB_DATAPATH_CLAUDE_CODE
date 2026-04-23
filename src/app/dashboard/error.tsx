'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0f0f1a] px-4 text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-white">Algo salió mal</p>
        <p className="mt-1 text-sm text-neutral-500">
          Se produjo un error inesperado al cargar esta página.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-neutral-700">
            ref: {error.digest}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-white/8 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/12 hover:text-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Intentar de nuevo
      </button>
    </div>
  )
}
