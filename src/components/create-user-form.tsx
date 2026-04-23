'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { createManagedUser } from '@/actions/users'
import { allowedEmailDomainsLabel } from '@/lib/allowed-email-domains'
import { type UserRole } from '@/types/tasks'

export function CreateUserForm() {
  const domainsLabel = allowedEmailDomainsLabel()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('collaborator')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTrans] = useTransition()

  function handleCreate() {
    setError(null)
    setMessage(null)

    startTrans(async () => {
      const res = await createManagedUser(fullName, email, password, role)
      if (res.error) {
        setError(res.error)
        return
      }

      setFullName('')
      setEmail('')
      setPassword('')
      setRole('collaborator')
      setMessage('Usuario creado y confirmado.')
    })
  }

  return (
    <section className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          <UserPlus className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Alta de usuario</p>
          <p className="text-xs text-neutral-500">
            Crea usuarios confirmados sin correo de verificacion. Dominios permitidos: {domainsLabel}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_180px_170px_auto]">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
          className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="usuario@test1234.com"
          className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Contrasena temporal"
          className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [&>option]:bg-[#1a1a2e]"
        >
          <option value="collaborator">Colaborador</option>
          <option value="leader">Lider</option>
          <option value="admin_system">Admin</option>
        </select>
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending || !fullName.trim() || !email.trim() || !password}
          className="h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Creando...' : 'Crear'}
        </button>
      </div>

      {error && <p className="mt-2 text-[10px] text-red-400">{error}</p>}
      {message && <p className="mt-2 text-[10px] text-green-400">{message}</p>}
    </section>
  )
}
