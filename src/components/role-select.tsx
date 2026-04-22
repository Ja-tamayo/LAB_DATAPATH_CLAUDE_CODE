'use client'

import { useTransition } from 'react'
import { updateUserRole } from '@/actions/users'
import { type UserRole, ROLE_CONFIG } from '@/types/tasks'
import { cn } from '@/lib/utils'

interface RoleSelectProps {
  userId: string
  currentRole: UserRole
  isSelf: boolean
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'collaborator', label: 'Colaborador' },
  { value: 'leader',       label: 'Líder'       },
  { value: 'admin_system', label: 'Admin'        },
]

export function RoleSelect({ userId, currentRole, isSelf }: RoleSelectProps) {
  const [pending, startTrans] = useTransition()
  const cfg = ROLE_CONFIG[currentRole]

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentRole}
        disabled={pending || isSelf}
        title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}
        onChange={(e) => {
          const next = e.target.value as UserRole
          startTrans(async () => { await updateUserRole(userId, next) })
        }}
        className={cn(
          'text-[9px] px-1.5 py-0.5 rounded font-semibold appearance-none cursor-pointer transition-colors',
          'border-0 focus:outline-none',
          cfg.className,
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&>option]:bg-[#1a1a2e] [&>option]:text-white [&>option]:text-xs',
        )}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {pending && <span className="text-[9px] text-neutral-500">…</span>}
    </div>
  )
}
