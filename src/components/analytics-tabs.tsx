'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type TabId = 'my_load' | 'team' | 'risks'

interface AnalyticsTabsProps {
  isPrivileged: boolean
  myLoad: React.ReactNode
  team: React.ReactNode
  risks: React.ReactNode
}

export function AnalyticsTabs({ isPrivileged, myLoad, team, risks }: AnalyticsTabsProps) {
  const [active, setActive] = useState<TabId>('my_load')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'my_load', label: 'Mi carga' },
    ...(isPrivileged ? [
      { id: 'team'  as TabId, label: 'Equipo'  },
      { id: 'risks' as TabId, label: 'Riesgos' },
    ] : []),
  ]

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              active === t.id ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {active === 'my_load' && myLoad}
        {active === 'team'    && isPrivileged && team}
        {active === 'risks'   && isPrivileged && risks}
      </div>
    </div>
  )
}
