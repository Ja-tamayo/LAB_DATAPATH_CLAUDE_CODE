'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserOption {
  id: string
  email: string
  full_name: string | null
}

export async function getUsers(): Promise<UserOption[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Only leaders and admins need the full user list (for task assignment)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'collaborator'
  if (role === 'collaborator') return []

  // Join profiles with auth.users via the service role is not available on client;
  // instead return profiles that exist (users who have logged in at least once)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  if (!profiles) return []

  // Enrich with email from auth — available via supabase admin only,
  // so we return id + full_name and fall back to showing initials in UI
  return profiles.map((p) => ({
    id:        p.id as string,
    email:     '',
    full_name: p.full_name as string | null,
  }))
}
