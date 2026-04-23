'use client'

import { login } from '@/actions/auth'
import { allowedEmailDomainsLabel } from '@/lib/allowed-email-domains'

interface LoginFormProps {
  defaultTab?: string
  serverError?: string
  serverMessage?: string
}

export function LoginForm({ defaultTab, serverError, serverMessage }: LoginFormProps) {
  const cameFromSignup = defaultTab === 'signup'
  const domainsLabel = allowedEmailDomainsLabel()

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
          T
        </div>
        <span className="text-2xl font-semibold text-white">
          TaskFlow <span className="text-blue-400">AI</span>
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-neutral-400">
              Correo electronico
              <span className="ml-1 text-[11px] text-neutral-600">({domainsLabel})</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@test1234.com"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-neutral-400">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="********"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          {serverError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {decodeURIComponent(serverError)}
            </p>
          )}

          {serverMessage && (
            <p className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-400">
              {decodeURIComponent(serverMessage)}
            </p>
          )}

          {cameFromSignup && (
            <p className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-neutral-500">
              Las cuentas se crean desde Personas por un administrador.
            </p>
          )}

          <button
            type="submit"
            className="mt-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Iniciar sesion
          </button>
        </form>
      </div>
    </div>
  )
}
