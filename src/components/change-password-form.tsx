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
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
      >
        <KeyRound className="h-3.5 w-3.5" />
        Cambiar contraseña
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-200">Cambiar contraseña</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-1.5 py-1 text-[10px] text-neutral-600 transition-colors hover:bg-white/5 hover:text-white"
        >
          Cerrar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          placeholder="Contraseña actual"
          className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          placeholder="Nueva contraseña"
          className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          onClick={handleChange}
          disabled={pending || !currentPassword || newPassword.length < 8}
          className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </div>

      {error && <p className="mt-2 text-[10px] text-red-400">{error}</p>}
      {message && <p className="mt-2 text-[10px] text-green-400">{message}</p>}
    </div>
  )
}
