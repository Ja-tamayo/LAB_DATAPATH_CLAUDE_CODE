'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BarChart2, Users, Briefcase, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/actions/auth'
import { type UserRole, ROLE_CONFIG } from '@/types/tasks'

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
    roles: ['leader', 'admin_system'],
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
    <aside className="w-[220px] shrink-0 bg-[#0a0a14] border-r border-white/5 flex flex-col min-h-screen sticky top-0">

      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            T
          </div>
          <span className="text-sm font-semibold">
            TaskFlow <span className="text-blue-400">AI</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-3 border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
            <User className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-neutral-300 truncate">{userEmail}</p>
            <span className={cn('text-[9px] px-1 rounded font-semibold', roleConfig.className)}>
              {roleConfig.label}
            </span>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </form>
      </div>
    </aside>
  )
}
