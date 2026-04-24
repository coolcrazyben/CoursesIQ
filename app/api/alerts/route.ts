export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { CURRENT_TERM_CODE } from '@/lib/constants'

const AlertSchema = z.object({
  crn: z.string().min(1),
  subject: z.string().min(1),
  course_number: z.string().min(1),
  email: z.string().email(),
  phone_number: z.string().optional(),
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

  const { crn, subject, course_number, email, phone_number, course_name, term_code } =
    result.data

  // 2. Check for duplicate alert — app-level defense
  // DB unique constraint (alerts_crn_email_unique) is the race-condition-safe gate.
  const { data: existing, error: selectError } = await adminClient
    .from('alerts')
    .select('id')
    .eq('crn', crn)
    .eq('email', email)
    .maybeSingle()

  if (selectError) {
    console.error('[api/alerts] Supabase duplicate check error:', selectError.message)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json(
      { error: 'Alert already exists for this CRN and email' },
      { status: 409 }
    )
  }

  // 3. Insert new alert row
  const { data, error } = await adminClient
    .from('alerts')
    .insert({
      crn,
      subject,
      course_number,
      course_name: course_name ?? null,
      email,
      phone_number: phone_number ?? null,
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
