import 'server-only'
import { adminClient } from './supabase/admin'

export type Plan = 'free' | 'pro'

export const FREE_LIMITS = {
  alerts:    1,
  schedules: 1,
} as const

export async function getUserPlan(userId: string): Promise<Plan> {
  const { data } = await adminClient
    .from('user_subscriptions')
    .select('plan, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data || data.plan !== 'pro') return 'free'
  // Treat as free if period has expired (webhook may not have fired yet)
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) return 'free'
  return 'pro'
}
