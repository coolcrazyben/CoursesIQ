export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { CURRENT_TERM_CODE } from '@/lib/constants'
import { getUserPlan, FREE_LIMITS } from '@/lib/subscription'

const AlertSchema = z.object({
  crn: z.string().optional(),
  section_number: z.string().optional(),
  subject: z.string().min(1),
  course_number: z.string().min(1),
  email: z.string().email(),
  phone_number: z.string().optional(),
  course_name: z.string().optional(),
  term_code: z.string().optional(),
})

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { id, waitlist_position, waitlist_total } = body as { id?: string; waitlist_position?: number | null; waitlist_total?: number | null }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await adminClient
    .from('alerts')
    .update({ waitlist_position: waitlist_position ?? null, waitlist_total: waitlist_total ?? null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = AlertSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.issues },
      { status: 400 }
    )
  }

  const { crn, section_number, subject, course_number, email, phone_number, course_name, term_code } =
    result.data

  // 2. Free-tier limit: max 1 active alert per user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const plan = userId ? await getUserPlan(userId) : 'free'
  if (plan === 'free') {
    const { count } = await adminClient
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .eq('is_active', true)
    if ((count ?? 0) >= FREE_LIMITS.alerts) {
      return NextResponse.json({ error: 'UPGRADE_REQUIRED', limit: FREE_LIMITS.alerts }, { status: 402 })
    }
  }

  // 3. Check for duplicate alert.
  // Section-specific (has CRN): dedup by crn+email.
  // Course-level (no CRN): dedup by subject+course_number+email (crn='').
  const dupQuery = adminClient.from('alerts').select('id').eq('email', email).eq('is_active', true)
  const dupResult = crn
    ? await dupQuery.eq('crn', crn).maybeSingle()
    : await dupQuery.eq('subject', subject).eq('course_number', course_number).eq('crn', '').maybeSingle()

  if (dupResult.error) {
    console.error('[api/alerts] Supabase duplicate check error:', dupResult.error.message)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  if (dupResult.data) {
    return NextResponse.json(
      { error: 'Alert already exists for this course and email' },
      { status: 409 }
    )
  }

  // 4. Insert new alert row, or reactivate a previously cancelled one.
  const { data, error } = await adminClient
    .from('alerts')
    .upsert({
      crn: crn ?? '',
      section_number: section_number ?? null,
      subject,
      course_number,
      course_name: course_name ?? null,
      email,
      phone_number: phone_number ?? null,
      school: 'MSU',
      term_code: term_code ?? CURRENT_TERM_CODE,
      is_active: true,
    }, { onConflict: 'crn,email' })
    .select('id')
    .single()

  if (error) {
    console.error('[api/alerts] Supabase insert error:', error.message)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
