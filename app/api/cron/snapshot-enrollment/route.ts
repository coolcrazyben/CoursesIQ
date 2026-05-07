export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getSectionsByCourse } from '@/lib/banner'
import { CURRENT_TERM_CODE } from '@/lib/constants'

/**
 * Daily enrollment snapshot cron.
 *
 * Replaces the retired check-seats cron. Instead of emailing on seat opens,
 * this records a daily snapshot of seats_available / seats_total / wait_count
 * for every CRN that has at least one active alert.
 *
 * After 2–3 weeks of data, the dashboard can display fill velocity:
 * "filling 3 seats/day" or "will be full in ~4 days".
 *
 * Schedule: daily (configure in vercel.json or Vercel dashboard).
 * Auth: Bearer CRON_SECRET header.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Collect all unique (subject, course_number) pairs from active alerts with a CRN
  const { data: alertRows, error: fetchError } = await adminClient
    .from('alerts')
    .select('crn, subject, course_number')
    .eq('is_active', true)
    .not('crn', 'is', null)
    .neq('crn', '')

  if (fetchError) {
    console.error('[cron/snapshot-enrollment] fetch alerts error:', fetchError.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!alertRows?.length) {
    return NextResponse.json({ snapshotted: 0 })
  }

  // Deduplicate by subject+course_number to minimise Banner API calls
  const pairs = new Map<string, { subject: string; course_number: string }>()
  for (const a of alertRows) {
    const key = `${a.subject}:${a.course_number}`
    if (!pairs.has(key)) pairs.set(key, { subject: a.subject, course_number: a.course_number })
  }

  let snapshotted = 0

  for (const { subject, course_number } of pairs.values()) {
    let sections
    try {
      sections = await getSectionsByCourse(subject, course_number)
    } catch (err) {
      console.error(`[cron/snapshot-enrollment] Banner error for ${subject} ${course_number}:`, err)
      continue
    }

    // Only snapshot CRNs that are actively watched
    const watchedCrns = new Set(
      alertRows
        .filter(a => a.subject === subject && a.course_number === course_number)
        .map(a => a.crn as string)
    )

    const rows = sections
      .filter(s => watchedCrns.has(s.courseReferenceNumber))
      .map(s => ({
        crn:             s.courseReferenceNumber,
        term_code:       CURRENT_TERM_CODE,
        seats_available: s.seatsAvailable,
        seats_total:     s.maximumEnrollment,
        wait_count:      s.waitCount,
      }))

    if (rows.length === 0) continue

    const { error: insertError } = await adminClient
      .from('enrollment_snapshots')
      .insert(rows)

    if (insertError) {
      console.error(`[cron/snapshot-enrollment] insert error for ${subject} ${course_number}:`, insertError.message)
    } else {
      snapshotted += rows.length
    }
  }

  return NextResponse.json({ snapshotted, pairs: pairs.size })
}
