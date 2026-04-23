'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BarChart2, Users, Briefcase, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth'
import { type UserRole, ROLE_CONFIG } from '@/types/tasks'
import { ChangePasswordForm } from '@/components/change-password-form'

interface SidebarNavProps {
  role: UserRole
  userEmail: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href:  '/dashboard',
    label: 'Board',
    icon:  <LayoutGrid className="w-4 h-4" />,
  },
  {
    href:  '/dashboard/operational',
    label: 'Analítica',
    icon:  <BarChart2 className="w-4 h-4" />,
  },
  {
    href:  '/dashboard/people',
    label: 'Personas',
    icon:  <Users className="w-4 h-4" />,
    roles: ['leader', 'admin_system'],
  },
  {
    href:  '/dashboard/clients',
    label: 'Clientes',
    icon:  <Briefcase className="w-4 h-4" />,
    roles: ['leader', 'admin_system'],
  },
]

export function SidebarNav({ role, userEmail }: SidebarNavProps) {
  const pathname = usePathname()
  const roleConfig = ROLE_CONFIG[role]

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  )

  return (
    <aside className="sticky top-0 flex h-screen supports-[height:100dvh]:h-[100dvh] w-[236px] shrink-0 flex-col overflow-y-auto border-r border-white/6 bg-[#0b0c15]/95 backdrop-blur">

      <div className="border-b border-white/6 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow-[0_0_24px_rgba(59,130,246,0.25)]">
            T
          </div>
          <div>
            <span className="block text-sm font-semibold leading-none">
              TaskFlow <span className="text-blue-400">AI</span>
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Workspace
            </span>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
                  : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/6 px-3 py-3">
        <div className="rounded-xl border border-white/6 bg-white/[0.025] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-neutral-200">{userEmail}</p>
              <span className={cn('mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold', roleConfig.className)}>
                {roleConfig.label}
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <ChangePasswordForm />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  )
}
