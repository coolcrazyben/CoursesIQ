import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const schema = z.object({
  alert_id: z.string().uuid(),
  outcome: z.enum(['yes', 'no', 'alternative']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { alert_id, outcome } = parsed.data

  // IDOR guard: verify the alert belongs to this user
  const { data: alert } = await adminClient
    .from('alerts')
    .select('email')
    .eq('id', alert_id)
    .maybeSingle()

  if (!alert || alert.email !== user.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('enrollment_outcomes')
    .insert({ alert_id, outcome })

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ ok: true }, { status: 201 })
}
