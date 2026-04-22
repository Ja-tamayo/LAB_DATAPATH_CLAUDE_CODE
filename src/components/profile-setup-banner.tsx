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
    <div className="mx-4 mt-3 p-3 bg-blue-500/8 border border-blue-500/20 rounded-lg flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs font-medium text-blue-300">¿Cómo te llamas?</p>
        <p className="text-[10px] text-neutral-500 mt-0.5">Agrega tu nombre para que el equipo pueda identificarte.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Nombre completo"
          className="px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 w-40"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || pending}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-md transition-colors shrink-0"
        >
          {pending ? '…' : 'Guardar'}
        </button>
      </div>
      {error && <p className="w-full text-[10px] text-red-400">{error}</p>}
    </div>
  )
}
