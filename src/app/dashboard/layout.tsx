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

  // Ensure profile row exists, and fetch full_name in one shot
  const { data: profile } = await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
    .select('full_name')
    .single()

  const role = await getCurrentUserRole()
  const needsName = !profile?.full_name

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex">
      <SidebarNav role={role} userEmail={user.email ?? ''} />
      <div className="flex-1 min-w-0 overflow-auto flex flex-col">
        {needsName && <ProfileSetupBanner />}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}
