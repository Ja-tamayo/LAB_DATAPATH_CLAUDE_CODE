import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/actions/tasks'
import { SidebarNav } from '@/components/sidebar-nav'
import { ProfileSetupBanner } from '@/components/profile-setup-banner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Upsert ensures the profile row exists; without ignoreDuplicates the row
  // is always returned (ON CONFLICT DO UPDATE returns the existing row).
  const { data: profile } = await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id' })
    .select('full_name')
    .single()

  const role = await getCurrentUserRole()
  const needsName = !profile?.full_name

  return (
    <div className="flex min-h-screen bg-[#0f0f1a] text-white">
      <SidebarNav role={role} userEmail={user.email ?? ''} />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {needsName && <ProfileSetupBanner />}
        <div className="flex-1 min-h-0 px-1 pb-1">
          {children}
        </div>
      </div>
    </div>
  )
}
