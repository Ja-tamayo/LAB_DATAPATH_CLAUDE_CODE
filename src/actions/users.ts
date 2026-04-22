'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type UserRole } from '@/types/tasks'

export interface UserOption {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  weekly_capacity_tokens: number
}

export async function updateUserRole(targetUserId: string, newRole: UserRole): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only admin_system can change roles
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin_system') return { error: 'Sin permisos' }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/people')
  return { error: null }
}

export async function updateProfile(fullName: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = fullName.trim()
  if (!trimmed) return { error: 'El nombre no puede estar vacío' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function getUsers(): Promise<UserOption[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'collaborator'
  if (role === 'collaborator') return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, weekly_capacity_tokens')
    .order('full_name')

  if (!profiles) return []

  return profiles.map((p) => ({
    id:                     p.id as string,
    email:                  '',
    full_name:              p.full_name as string | null,
    role:                   (p.role as UserRole) ?? 'collaborator',
    weekly_capacity_tokens: (p.weekly_capacity_tokens as number) ?? 40,
  }))
}
