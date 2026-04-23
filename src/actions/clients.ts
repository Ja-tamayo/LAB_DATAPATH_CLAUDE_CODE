'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ProjectOption {
  id:     string
  name:   string
  status: 'active' | 'inactive'
}

export interface ClientOption {
  id:       string
  name:     string
  status:   'active' | 'inactive'
  projects: ProjectOption[]
}

export async function getClientsWithProjects(): Promise<ClientOption[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status, projects(id, name, status)')
    .order('name')

  if (error) {
    // Silently return [] — callers get an empty list, page stays functional
    console.warn('[getClientsWithProjects]', error.message)
    return []
  }
  if (!data) return []

  return data.map((c) => ({
    id:       c.id as string,
    name:     c.name as string,
    status:   c.status as 'active' | 'inactive',
    projects: ((c.projects as { id: string; name: string; status: string }[]) ?? [])
      .map((p) => ({ id: p.id, name: p.name, status: p.status as 'active' | 'inactive' }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))
}

/** Returns true when the clients table is accessible (migration 016 applied). */
export async function clientsTableReady(): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').select('id').limit(1)
  return !error
}

export async function createClientRecord(name: string): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'El nombre es requerido' }

  const { data, error } = await supabase
    .from('clients')
    .insert({ name: trimmed, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: `DB: ${error.message} (code: ${error.code})` }
  revalidatePath('/dashboard/clients')
  return { error: null, id: data.id as string }
}

export async function updateClientStatus(id: string, status: 'active' | 'inactive'): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update({ status }).eq('id', id)
  if (error) return { error: `DB: ${error.message} (code: ${error.code})` }
  revalidatePath('/dashboard/clients')
  return { error: null }
}

export async function deleteClientRecord(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) return { error: `DB: ${error.message} (code: ${error.code})` }
  revalidatePath('/dashboard/clients')
  return { error: null }
}

export async function createProjectRecord(clientId: string, name: string): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'El nombre es requerido' }

  const { data, error } = await supabase
    .from('projects')
    .insert({ client_id: clientId, name: trimmed, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: `DB: ${error.message} (code: ${error.code})` }
  revalidatePath('/dashboard/clients')
  return { error: null, id: data.id as string }
}

export async function updateProjectStatus(id: string, status: 'active' | 'inactive'): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').update({ status }).eq('id', id)
  if (error) return { error: `DB: ${error.message} (code: ${error.code})` }
  revalidatePath('/dashboard/clients')
  return { error: null }
}

export async function deleteProjectRecord(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: `DB: ${error.message} (code: ${error.code})` }
  revalidatePath('/dashboard/clients')
  return { error: null }
}
