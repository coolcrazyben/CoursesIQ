export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

function toPeriodEndISO(val: unknown): string | null {
  if (typeof val === 'number') return new Date(val * 1000).toISOString()
  if (typeof val === 'string' && val) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set — check your environment variables')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const obj = event.data.object as Stripe.Subscription & { current_period_end: number }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const userId = obj.metadata?.user_id
      if (!userId) break
      await adminClient.from('user_subscriptions').upsert({
        user_id:               userId,
        stripe_customer_id:    obj.customer as string,
        stripe_subscription_id: obj.id,
        plan:                  obj.status === 'active' ? 'pro' : 'free',
        billing_interval:      obj.items.data[0]?.price.recurring?.interval ?? null,
        current_period_end:    toPeriodEndISO((obj as unknown as Record<string, unknown>).current_period_end),
        cancel_at_period_end:  obj.cancel_at_period_end,
        updated_at:            new Date().toISOString(),
      })
      break
    }
    case 'customer.subscription.deleted': {
      const userId = obj.metadata?.user_id
      if (!userId) break
      await adminClient.from('user_subscriptions').upsert({
        user_id:               userId,
        stripe_subscription_id: null,
        plan:                  'free',
        current_period_end:    null,
        updated_at:            new Date().toISOString(),
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
