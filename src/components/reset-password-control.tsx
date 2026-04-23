'use client'

import { useState, useTransition } from 'react'
import { KeyRound } from 'lucide-react'
import { resetManagedUserPassword } from '@/actions/users'

interface ResetPasswordControlProps {
  userId: string
  disabled?: boolean
}

export function ResetPasswordControl({ userId, disabled }: ResetPasswordControlProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTrans] = useTransition()

  function handleReset() {
    setError(null)
    setMessage(null)

    startTrans(async () => {
      const res = await resetManagedUserPassword(userId, password)
      if (res.error) {
        setError(res.error)
        return
      }

      setPassword('')
      setMessage('Contraseña actualizada.')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? 'No puedes resetear tu propia contraseña aquí' : 'Resetear contraseña'}
        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-neutral-400 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <KeyRound className="h-3 w-3" />
        Reset
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Temporal"
          className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleReset}
          disabled={pending || password.length < 8}
          className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setPassword('')
            setError(null)
            setMessage(null)
          }}
          className="rounded-md px-1 py-1 text-[10px] text-neutral-600 transition-colors hover:text-white"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-[9px] text-red-400">{error}</p>}
      {message && <p className="text-[9px] text-green-400">{message}</p>}
    </div>
  )
}
