export const runtime = 'nodejs'

// Required: imports libphonenumber-js and adminClient from @/lib/supabase/admin.
// Edge Runtime does not support Node.js native modules — declare nodejs runtime explicitly.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parsePhoneNumber } from 'libphonenumber-js'
import { adminClient } from '@/lib/supabase/admin'
import { CURRENT_TERM_CODE } from '@/lib/constants'

const AlertSchema = z.object({
  crn: z.string().min(1),
  subject: z.string().min(1),
  course_number: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email().optional(),
  course_name: z.string().optional(),
  term_code: z.string().optional(),
})

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

  const { crn, subject, course_number, phone_number, email, course_name, term_code } =
    result.data

  // 2. Normalize phone number to E.164 (ALRT-02)
  let e164: string
  try {
    const parsed = parsePhoneNumber(phone_number, 'US')
    if (!parsed || !parsed.isValid()) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }
    e164 = parsed.number // E.164 string e.g. "+16015551234"
  } catch {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // 3. Check for duplicate alert — app-level defense (ALRT-03)
  // DB unique constraint (alerts_crn_phone_unique) is the race-condition-safe gate;
  // this SELECT is secondary confirmation that avoids unnecessary INSERT attempts.
  // Note: check regardless of is_active — phone+CRN should not be duplicated even if deactivated.
  const { data: existing, error: selectError } = await adminClient
    .from('alerts')
    .select('id')
    .eq('crn', crn)
    .eq('phone_number', e164)
    .maybeSingle()

  if (selectError) {
    console.error('[api/alerts] Supabase duplicate check error:', selectError.message)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json(
      { error: 'Alert already exists for this CRN and phone number' },
      { status: 409 }
    )
  }

  // 4. Insert new alert row (ALRT-01)
  const { data, error } = await adminClient
    .from('alerts')
    .insert({
      crn,
      subject,
      course_number,
      course_name: course_name ?? null,
      phone_number: e164,
      email: email ?? null,
      school: 'MSU',
      term_code: term_code ?? CURRENT_TERM_CODE,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation — race condition duplicate (two concurrent identical POSTs)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Duplicate alert' }, { status: 409 })
    }
    console.error('[api/alerts] Supabase insert error:', error.message)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
