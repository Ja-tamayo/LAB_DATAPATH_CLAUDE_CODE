'use client'

import { useState, useTransition } from 'react'
import { KeyRound } from 'lucide-react'
import { updateOwnPassword } from '@/actions/users'

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTrans] = useTransition()

  function handleChange() {
    setError(null)
    setMessage(null)

    startTrans(async () => {
      const res = await updateOwnPassword(currentPassword, newPassword)
      if (res.error) {
        setError(res.error)
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setMessage('Contraseña actualizada.')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
      >
        <KeyRound className="h-3.5 w-3.5" />
        Cambiar contraseña
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium text-neutral-300">Cambiar contraseña</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-neutral-600 hover:text-white"
        >
          Cerrar
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          placeholder="Contraseña actual"
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
        />
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          placeholder="Nueva contraseña"
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleChange}
          disabled={pending || !currentPassword || newPassword.length < 8}
          className="rounded-md bg-blue-600 px-2 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[9px] text-red-400">{error}</p>}
      {message && <p className="mt-1.5 text-[9px] text-green-400">{message}</p>}
    </div>
  )
}
