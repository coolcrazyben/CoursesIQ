import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscription'
import UpgradeClient from './UpgradeClient'

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const plan = user ? await getUserPlan(user.id) : 'free'

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <div className="text-center mb-14">
        <h1 className="text-h1 text-on-surface mb-3">Simple, transparent pricing</h1>
        <p className="text-body-lg text-secondary">Start free. Upgrade when you need more.</p>
      </div>

      <UpgradeClient plan={plan} loggedIn={!!user} />

      <p className="text-center text-xs text-secondary mt-8">
        Payments processed securely by Stripe. Cancel anytime.
      </p>
    </div>
  )
}
