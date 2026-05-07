import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { sendLeadWelcomeEmail } from '@/lib/resend'

const schema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  major: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  page_slug: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { email, first_name, major, utm_source, utm_medium, utm_campaign, page_slug } = parsed.data

  // Idempotent — skip if same email captured in last 24h
  const { data: existing } = await adminClient
    .from('lead_captures')
    .select('id')
    .eq('email', email)
    .gte('created_at', new Date(Date.now() - 86400_000).toISOString())
    .limit(1)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true, skipped: true })

  const { error: insertErr } = await adminClient.from('lead_captures').insert({
    email, first_name, major, utm_source, utm_medium, utm_campaign, page_slug,
  })
  if (insertErr) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  try {
    await sendLeadWelcomeEmail(email, first_name)
  } catch {
    // Non-fatal — lead is captured even if email fails
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
