'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type UserRole } from '@/types/tasks'

export interface CurrentUser {
  id: string
  email: string
  role: UserRole
}

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setCurrentUser({
        id:    user.id,
        email: user.email ?? '',
        role:  (profile?.role as UserRole) ?? 'collaborator',
      })
      setLoading(false)
    }

    load()
  }, [])

  return { currentUser, loading }
}
