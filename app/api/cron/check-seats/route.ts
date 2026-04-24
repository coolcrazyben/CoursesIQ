export const runtime = 'nodejs'
// Imports lib/resend.ts which is server-only.
// Edge Runtime is not supported — declare nodejs runtime explicitly.

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getSeatsByCRN } from '@/lib/banner'
import { sendSeatAlert } from '@/lib/resend'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate via CRON_SECRET (ALRT-04)
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch all active alerts not yet notified and not opted out (ALRT-05)
  const { data: alerts, error: fetchError } = await adminClient
    .from('alerts')
    .select('id, crn, subject, course_number, course_name, email, opted_out')
    .eq('is_active', true)
    .is('sent_at', null)
    .eq('opted_out', false)

  if (fetchError) {
    console.error('[cron/check-seats] Failed to fetch alerts:', fetchError.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ checked: 0, alerted: 0 })
  }

  // 3. Group alerts by (subject, course_number) to batch Banner calls (ALRT-06)
  const groups = new Map<string, typeof alerts>()
  for (const alert of alerts) {
    const key = `${alert.subject}:${alert.course_number}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(alert)
  }

  let checked = 0
  let alerted = 0

  // 4. For each group, deduplicate CRNs and call Banner once per unique CRN (ALRT-06)
  for (const [, groupAlerts] of groups) {
    const { subject, course_number } = groupAlerts[0]

    // Deduplicate CRNs within the group — multiple subscribers may watch the same section.
    // This is the batching core: 50 subscribers on 3 CRNs = 3 Banner calls, not 50.
    const uniqueCrns = [...new Set(groupAlerts.map((a) => a.crn))]

    for (const crn of uniqueCrns) {
      // ONE Banner API call per unique CRN regardless of subscriber count (ALRT-06 batching)
      let seatData
      try {
        seatData = await getSeatsByCRN(crn, subject, course_number)
      } catch (err) {
        console.error(`[cron/check-seats] Banner error for CRN ${crn}:`, err)
        continue
      }

      // All subscribers watching this specific CRN
      const crnAlerts = groupAlerts.filter((a) => a.crn === crn)
      checked += crnAlerts.length

      if (!seatData || seatData.seatsAvailable <= 0) continue

      // Seat is open — dispatch email to ALL subscribers of this CRN (ALRT-07)
      for (const alert of crnAlerts) {
        try {
          const messageId = await sendSeatAlert(
            alert.email,
            alert.course_name ?? `${subject} ${course_number}`,
            alert.crn
          )
          // Update alert: mark sent, deactivate, store message ID (ALRT-09)
          await adminClient
            .from('alerts')
            .update({
              sent_at: new Date().toISOString(),
              is_active: false,
              message_id: messageId,
            })
            .eq('id', alert.id)
          alerted++
        } catch (err: unknown) {
          console.error(`[cron/check-seats] Resend error for alert ${alert.id}:`, err)
        }
      }
    }
  }

  // 5. Re-alert reset: for previously notified alerts, reset if seat has closed
  // This allows re-alerting if the seat opens again after being filled
  const { data: notifiedAlerts } = await adminClient
    .from('alerts')
    .select('id, crn, subject, course_number')
    .eq('is_active', false)
    .not('sent_at', 'is', null)
    .eq('opted_out', false)

  if (notifiedAlerts) {
    for (const alert of notifiedAlerts) {
      try {
        const seatData = await getSeatsByCRN(alert.crn, alert.subject, alert.course_number)
        if (seatData && seatData.seatsAvailable === 0) {
          // Seat closed again — reset so subscriber is re-alerted when it reopens
          await adminClient
            .from('alerts')
            .update({ sent_at: null, is_active: true })
            .eq('id', alert.id)
        }
      } catch {
        // Non-fatal — skip this alert on error, try again next cron run
      }
    }
  }

  return NextResponse.json({ checked, alerted })
}
