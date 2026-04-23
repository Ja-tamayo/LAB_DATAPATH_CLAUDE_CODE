'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAllowedEmailDomain, allowedEmailDomainsLabel } from '@/lib/allowed-email-domains'
import { type UserRole } from '@/types/tasks'

export interface UserOption {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  weekly_capacity_tokens: number
}

async function assertAdminSystem(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin_system') return { error: 'Sin permisos' }

  return { error: null }
}

export async function updateUserRole(targetUserId: string, newRole: UserRole): Promise<{ error: string | null }> {
  const authz = await assertAdminSystem()
  if (authz.error) return authz

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)
    .select('id')
    .single()

  if (error) return { error: error.message }
  if (!data) return { error: 'No se pudo actualizar el rol' }
  revalidatePath('/dashboard/people')
  return { error: null }
}

export async function updateUserWeeklyCapacity(
  targetUserId: string,
  weeklyCapacityTokens: number,
): Promise<{ error: string | null; capacity?: number }> {
  const authz = await assertAdminSystem()
  if (authz.error) return { error: authz.error }

  const safeCapacity = Math.max(0, Math.floor(weeklyCapacityTokens))

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update({ weekly_capacity_tokens: safeCapacity })
    .eq('id', targetUserId)
    .select('weekly_capacity_tokens')
    .single()

  if (error) return { error: error.message }
  if (!data) return { error: 'No se pudo actualizar la capacidad' }
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/people')
  revalidatePath('/dashboard/operational')
  return { error: null, capacity: (data.weekly_capacity_tokens as number) ?? safeCapacity }
}

export async function createManagedUser(
  fullName: string,
  email: string,
  password: string,
  role: UserRole,
): Promise<{ error: string | null }> {
  const authz = await assertAdminSystem()
  if (authz.error) return authz

  const cleanName = fullName.trim()
  const cleanEmail = email.trim().toLowerCase()

  if (!cleanName || !cleanEmail || !password) return { error: 'Completa nombre, correo y contraseña' }
  if (!isAllowedEmailDomain(cleanEmail)) return { error: `Solo se permiten correos ${allowedEmailDomainsLabel()}` }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: cleanName },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'No se pudo crear el usuario' }

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: data.user.id,
      full_name: cleanName,
      role,
    }, { onConflict: 'id' })

  if (profileError) return { error: profileError.message }

  revalidatePath('/dashboard/people')
  return { error: null }
}

export async function resetManagedUserPassword(
  targetUserId: string,
  temporaryPassword: string,
): Promise<{ error: string | null }> {
  const authz = await assertAdminSystem()
  if (authz.error) return authz

  const password = temporaryPassword.trim()
  if (password.length < 8) return { error: 'La contraseña temporal debe tener al menos 8 caracteres' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(targetUserId, { password })

  if (error) return { error: error.message }
  return { error: null }
}

export async function updateOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'No autenticado' }

  if (newPassword.length < 8) return { error: 'La nueva contraseña debe tener al menos 8 caracteres' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) return { error: 'La contraseña actual no es correcta' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

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

  // Use cached role — avoids a second DB round-trip when called alongside getCurrentUserRole()
  const { getCurrentUserRole } = await import('@/actions/tasks')
  const role = await getCurrentUserRole()
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
