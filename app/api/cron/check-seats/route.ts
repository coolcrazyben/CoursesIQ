export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

// Seat-open alerts have been retired. The waitlist auto-holds seats for the
// next person in line; firing an email alert on a Banner seat opening creates
// a false signal — the seat is already reserved.
//
// Enrollment snapshots are now taken by /api/cron/snapshot-enrollment instead.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Seat-open alert cron retired. See /api/cron/snapshot-enrollment.' },
    { status: 501 }
  )
}
