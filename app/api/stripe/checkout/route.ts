export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { interval } = await req.json() as { interval: 'month' | 'year' }
  const priceId = interval === 'year'
    ? process.env.STRIPE_PRICE_ANNUAL
    : process.env.STRIPE_PRICE_MONTHLY

  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 })

  // Get or reuse existing Stripe customer
  const { data: existing } = await adminClient
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = existing?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    // Upsert so the customer id is saved even before checkout completes
    await adminClient.from('user_subscriptions').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const userId = user.id

  async function createSession(cid: string) {
    return stripe.checkout.sessions.create({
      customer: cid,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/dashboard?upgraded=true`,
      cancel_url:  `${base}/upgrade`,
      subscription_data: { metadata: { user_id: userId } },
    })
  }

  try {
    let session
    try {
      session = await createSession(customerId)
    } catch (err: unknown) {
      // Stale customer (wrong Stripe account / mode switch) — create a fresh one
      const isNoSuchCustomer = err instanceof Error && err.message.includes('No such customer')
      if (!isNoSuchCustomer) throw err
      const fresh = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = fresh.id
      await adminClient.from('user_subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      session = await createSession(customerId)
    }
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    console.error('[stripe/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
