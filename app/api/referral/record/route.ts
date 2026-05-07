import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'

const schema = z.object({
  referrer_code: z.string().min(1),
  referred_email: z.string().email(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { referrer_code, referred_email } = parsed.data

  const { data: row } = await adminClient
    .from('referrals')
    .select('id')
    .eq('referrer_code', referrer_code)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Invalid code' }, { status: 404 })

  await adminClient
    .from('referrals')
    .update({ referred_email, status: 'signed_up' })
    .eq('referrer_code', referrer_code)

  return NextResponse.json({ ok: true })
}
