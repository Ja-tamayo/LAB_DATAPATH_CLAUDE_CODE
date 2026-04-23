'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/actions/users'

export function ProfileSetupBanner() {
  const [name, setName]       = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [pending, startTrans] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startTrans(async () => {
      const res = await updateProfile(name)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="mx-4 mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] px-4 py-3">
      <div className="min-w-[180px] flex-1">
        <p className="text-xs font-medium text-blue-300">¿Cómo te llamas?</p>
        <p className="mt-1 text-xs text-neutral-500">Agrega tu nombre para que el equipo pueda identificarte.</p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Nombre completo"
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-52"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || pending}
          className="h-10 shrink-0 rounded-lg bg-blue-600 px-4 text-sm text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
        >
          {pending ? '…' : 'Guardar'}
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </div>
  )
}
