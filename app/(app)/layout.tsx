export const dynamic = 'force-dynamic'

import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscription'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const email = user?.email ?? ''
  const initials = email ? email[0].toUpperCase() : '?'
  const plan = user ? await getUserPlan(user.id) : 'free'

  return (
    <AppShell email={email} initials={initials} plan={plan}>
      {children}
    </AppShell>
  )
}
