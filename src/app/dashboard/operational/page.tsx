import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks, getCurrentUserRole } from '@/actions/tasks'
import { getUsers } from '@/actions/users'
import { getClientsWithProjects } from '@/actions/clients'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'

export const metadata = { title: 'Analítica — TaskFlow AI' }

export default async function OperationalPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) redirect('/login')

  const [allTasks, role, users, registeredClients] = await Promise.all([
    getTasks(),
    getCurrentUserRole(),
    getUsers(),
    getClientsWithProjects().catch(() => [] as Awaited<ReturnType<typeof getClientsWithProjects>>),
  ])

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('weekly_capacity_tokens')
    .eq('id', user.id)
    .single()

  const myCapacity = (myProfile?.weekly_capacity_tokens as number) ?? 40
  const isPrivileged = role === 'leader' || role === 'admin_system'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-white">Analítica</h1>
          <p className="text-xs text-neutral-500">Carga, riesgos y proyección operativa</p>
        </div>
        <p className="text-xs text-neutral-600">{allTasks.length} tareas totales</p>
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
