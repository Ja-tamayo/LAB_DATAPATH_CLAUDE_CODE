import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/actions/tasks'
import { type UserRole } from '@/types/tasks'
import { SidebarNav } from '@/components/sidebar-nav'
import { ProfileSetupBanner } from '@/components/profile-setup-banner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Wrap getUser so a transient Supabase network error never crashes the layout.
  let userId: string | null = null
  let userEmail = ''
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) console.error('[layout] getUser error:', error.message, error.status)
    userId    = data.user?.id    ?? null
    userEmail = data.user?.email ?? ''
  } catch (err) {
    console.error('[layout] getUser threw:', err)
  }

  if (!userId) redirect('/login')

  // Fetch full_name without upsert to avoid UPDATE permission issues.
  // Profile rows are created on first sign-in via auth trigger or first task.
  let fullName: string | null = null
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
    if (error) console.error('[layout] profile select error:', error.message)
    fullName = (profile?.full_name as string | null) ?? null

    if (!profile) {
      // Row doesn't exist yet — create it (ignoreDuplicates avoids UPDATE)
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })
      if (upsertErr) console.error('[layout] profile upsert error:', upsertErr.message)
    }
  } catch (err) {
    console.error('[layout] profile fetch threw:', err)
  }

  let role: UserRole = 'collaborator'
  try {
    role = await getCurrentUserRole()
  } catch (err) {
    console.error('[layout] getCurrentUserRole threw:', err)
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f1a] text-white">
      <SidebarNav role={role} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {!fullName && <ProfileSetupBanner />}
        <div className="flex-1 min-h-0 px-1 pb-1">
          {children}
        </div>
      </div>
    </div>
  )
}
