import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { getClientsWithProjects } from '@/actions/clients'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

export const metadata = { title: 'Analítica — TaskFlow AI' }

export default async function OperationalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [allTasks, role, users, registeredClients] = await Promise.all([
    getTasks(),
    getCurrentUserRole(),
    getUsers(),
    getClientsWithProjects().catch(() => [] as Awaited<ReturnType<typeof getClientsWithProjects>>),
  ])

  const { data: myProfile } = await supabase.from('profiles').select('weekly_capacity_tokens').eq('id', user.id).single()
  const myCapacity   = (myProfile?.weekly_capacity_tokens as number) ?? 40
  const isPrivileged = role === 'leader' || role === 'admin_system'

  return (
    <div className="flex flex-col h-full min-h-screen">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <h1 className="text-sm font-medium text-neutral-300">Analítica</h1>
        <p className="text-[10px] text-neutral-600">{allTasks.length} tareas totales</p>
      </header>
      <AnalyticsDashboard
        tasks={allTasks}
        users={users}
        registeredClients={registeredClients}
        currentUserId={user.id}
        currentUserCapacity={myCapacity}
        isPrivileged={isPrivileged}
      />
    </div>
  )
}
