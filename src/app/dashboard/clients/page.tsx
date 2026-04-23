import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/actions/tasks'
import { getClientsWithProjects, clientsTableReady } from '@/actions/clients'
import { ClientsManager } from '@/components/clients-manager'

export const metadata = { title: 'Clientes — TaskFlow AI' }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = await getCurrentUserRole()
  if (role === 'collaborator') redirect('/dashboard')

  const [clients, tableReady] = await Promise.all([
    getClientsWithProjects(),
    clientsTableReady(),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-white">Clientes &amp; Proyectos</h1>
          <p className="text-xs text-neutral-500">Estructura comercial activa y su organización por proyectos</p>
        </div>
        <p className="text-xs text-neutral-600">{clients.length} clientes registrados</p>
      </header>
      <main className="flex-1 overflow-auto p-4">
        {!tableReady ? (
          <div className="flex flex-col gap-3 max-w-2xl">
            <div className="p-4 bg-yellow-500/8 border border-yellow-500/25 rounded-xl">
              <p className="text-sm font-semibold text-yellow-400 mb-1">Migración pendiente</p>
              <p className="text-xs text-neutral-400 mb-3">
                La tabla de clientes no existe aún en la base de datos.
                Aplica la migración en el SQL Editor de Supabase para activar esta funcionalidad.
              </p>
              <p className="text-xs text-neutral-500 font-mono bg-black/30 px-3 py-2 rounded-lg select-all">
                supabase/migrations/016_clients_projects.sql
              </p>
              <p className="text-xs text-neutral-600 mt-2">
                Dashboard Supabase → SQL Editor → Nueva consulta → pega el contenido del archivo → Ejecutar
              </p>
            </div>
          </div>
        ) : (
          <ClientsManager
            initialClients={clients}
            isAdmin={role === 'admin_system'}
            isPrivileged={role === 'leader' || role === 'admin_system'}
          />
        )}
      </main>
    </div>
  )
}
