'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAllowedEmailDomain, allowedEmailDomainsLabel } from '@/lib/allowed-email-domains'

export async function login(formData: FormData) {
  const email    = ((formData.get('email') as string | null) ?? '').trim().toLowerCase()
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    redirect('/login?error=Completa+correo+y+contraseña')
  }

  if (!isAllowedEmailDomain(email)) {
    redirect(`/login?error=${encodeURIComponent(`Solo se permiten correos con dominio ${allowedEmailDomainsLabel()}`)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect('/login?error=Credenciales+incorrectas')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email    = ((formData.get('email') as string | null) ?? '').trim().toLowerCase()
  const password = (formData.get('password') as string | null) ?? ''
  const fullName = (formData.get('full_name') as string | null)?.trim() ?? ''

  if (!email || !password || !fullName) {
    redirect(`/login?tab=signup&error=${encodeURIComponent('Completa nombre, correo y contraseña')}`)
  }

  if (!isAllowedEmailDomain(email)) {
    redirect(`/login?tab=signup&error=${encodeURIComponent(`Solo se permiten correos con dominio ${allowedEmailDomainsLabel()}`)}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) redirect(`/login?tab=signup&error=${encodeURIComponent(error.message)}`)
  if (!data.session) {
    redirect(`/login?message=${encodeURIComponent('Cuenta creada. Revisa tu correo para confirmar el acceso.')}`)
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
