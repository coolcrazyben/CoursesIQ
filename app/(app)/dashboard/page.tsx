import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import DashboardAlerts from '@/components/DashboardAlerts'
import AddAlertModal from '@/components/AddAlertModal'
import { getUserPlan } from '@/lib/subscription'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Waitlist Tracker — CoursesIQ' }

export type Alert = {
  id: string
  crn: string | null
  subject: string
  course_number: string
  course_name: string | null
  created_at: string
  waitlist_position: number | null
  waitlist_total: number | null
}

function calcProbability(pos: number | null, total: number | null): { label: 'LIKELY' | 'STABLE' | 'UNLIKELY' | 'UNKNOWN'; pct: number } {
  if (!pos) return { label: 'UNKNOWN', pct: 0 }
  const ratio = total ? pos / total : null
  if (ratio !== null) {
    if (ratio <= 0.2) return { label: 'LIKELY',   pct: Math.max(75, Math.round(95 - ratio * 50)) }
    if (ratio <= 0.55) return { label: 'STABLE',  pct: Math.round(65 - ratio * 40) }
    return { label: 'UNLIKELY', pct: Math.max(5, Math.round(30 - (ratio - 0.55) * 60)) }
  }
  if (pos <= 3) return { label: 'LIKELY',   pct: 90 }
  if (pos <= 8) return { label: 'STABLE',   pct: 55 }
  return { label: 'UNLIKELY', pct: 18 }
}

function toPeriodEndISO(val: unknown): string | null {
  if (typeof val === 'number') return new Date(val * 1000).toISOString()
  if (typeof val === 'string' && val) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

async function syncSubscriptionFromStripe(userId: string) {
  try {
    const { data: sub } = await adminClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      const results = await stripe.customers.search({
        query: `metadata['supabase_user_id']:'${userId}'`,
        limit: 1,
      })
      customerId = results.data[0]?.id
    }

    if (!customerId) return

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    const activeSub = subscriptions.data[0]
    if (activeSub) {
      const rawPeriodEnd = (activeSub as unknown as Record<string, unknown>).current_period_end
      await adminClient.from('user_subscriptions').upsert({
        user_id:               userId,
        stripe_customer_id:    customerId,
        stripe_subscription_id: activeSub.id,
        plan:                  'pro',
        billing_interval:      activeSub.items.data[0]?.price.recurring?.interval ?? null,
        current_period_end:    toPeriodEndISO(rawPeriodEnd),
        cancel_at_period_end:  activeSub.cancel_at_period_end,
        updated_at:            new Date().toISOString(),
      })
    }
  } catch {
    // Non-fatal — webhook will catch it if Stripe call fails
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')

  const params = await searchParams
  if (params.upgraded === 'true') {
    await syncSubscriptionFromStripe(user.id)
  }

  const email = user.email!
  const plan  = await getUserPlan(user.id)

  const { data } = await adminClient
    .from('alerts')
    .select('id, crn, subject, course_number, course_name, created_at, waitlist_position, waitlist_total')
    .eq('email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const alerts: Alert[] = data ?? []

  const probs = alerts.map(a => calcProbability(a.waitlist_position, a.waitlist_total))
  const likelyCount   = probs.filter(p => p.label === 'LIKELY').length
  const unlikelyCount = probs.filter(p => p.label === 'UNLIKELY').length

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-h1 text-on-surface mb-1">Waitlist Tracker</h1>
          <p className="text-body-md text-secondary">
            Monitoring {alerts.length} potential opening{alerts.length !== 1 ? 's' : ''} · {email}
          </p>
        </div>
        <AddAlertModal
          userEmail={email}
          isPro={plan === 'pro'}
          alertCount={alerts.length}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: 'check_circle', iconColor: 'text-green-500',
            label: 'LIKELY ENTRY', value: String(likelyCount),
          },
          {
            icon: 'warning', iconColor: 'text-orange-400',
            label: 'LOW PROBABILITY', value: String(unlikelyCount),
          },
          {
            icon: 'history', iconColor: 'text-blue-400',
            label: 'AVG. WAIT TIME', value: '~5 min',
          },
          {
            icon: 'trending_up', iconColor: 'text-primary-container',
            label: 'COVERAGE', value: 'MSU',
          },
        ].map(({ icon, iconColor, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <span className={`material-symbols-outlined text-2xl ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <div>
              <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold">{label}</p>
              <p className="text-2xl font-black text-on-surface leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Active Monitoring</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-secondary">Live</span>
          </div>
        </div>
        <DashboardAlerts alerts={alerts} />
      </div>

      {/* How likelihood is calculated */}
      <div className="bg-primary-fixed/30 border border-primary-fixed rounded-xl p-6">
        <h3 className="text-h3 text-primary-container mb-2">How Likelihood is Calculated</h3>
        <p className="text-body-md text-secondary mb-4 max-w-2xl">
          We use your waitlist position relative to the total waitlist size to estimate your chances.
          Enter your position and total waitlist size on each course to see your probability.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Position / Total', icon: 'calculate' },
            { label: 'Drop Rates',       icon: 'trending_down' },
            { label: 'Historical Data',  icon: 'history_edu' },
            { label: 'Trend Analysis',   icon: 'insights' },
          ].map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-outline-variant text-sm text-secondary">
              <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
