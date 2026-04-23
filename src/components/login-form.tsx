'use client'

import { useState } from 'react'
import { login, signup } from '@/actions/auth'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  defaultTab?: string
  serverError?: string
}

export function LoginForm({ defaultTab, serverError }: LoginFormProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab === 'signup' ? 'signup' : 'login')
  const isSignup = tab === 'signup'

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
          T
        </div>
        <span className="text-2xl font-semibold text-white">
          TaskFlow <span className="text-blue-400">AI</span>
        </span>
      </div>

      {/* Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
              !isSignup ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
              isSignup ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            Crear cuenta
          </button>
        </div>

        <form action={isSignup ? signup : login} className="flex flex-col gap-4">
          {/* Name — signup only */}
          {isSignup && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className="text-sm text-neutral-400">
                Nombre completo
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                placeholder="José Ramírez"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-neutral-400">
              Correo electrónico
              {isSignup && <span className="ml-1 text-[11px] text-neutral-600">(@qudox.io)</span>}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={isSignup ? 'nombre@qudox.io' : 'tu@qudox.io'}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-neutral-400">
              Contraseña {isSignup && <span className="text-neutral-600">(mín. 6 caracteres)</span>}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? 6 : undefined}
              placeholder="••••••••"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {serverError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {decodeURIComponent(serverError)}
            </p>
          )}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium text-sm py-2.5 rounded-lg mt-1"
          >
            {isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
