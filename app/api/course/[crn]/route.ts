// Required: lib/banner.ts uses axios + tough-cookie (Node.js modules).
// Edge Runtime does not support these — must declare nodejs runtime explicitly.
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSeatsByCRN } from '@/lib/banner'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ crn: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  // Next.js 15: params is a Promise — must await before accessing properties.
  const { crn } = await params

  const { searchParams } = request.nextUrl
  const subject = searchParams.get('subject')
  const courseNumber = searchParams.get('courseNumber')

  // Validate required query params before hitting Banner.
  if (!subject || !courseNumber) {
    return NextResponse.json(
      { error: 'subject and courseNumber query params are required' },
      { status: 400 }
    )
  }

  let seatData
  try {
    seatData = await getSeatsByCRN(crn, subject, courseNumber)
  } catch (err) {
    console.error('[api/course] Banner fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to reach MSU Banner — try again later' },
      { status: 503 }
    )
  }

  if (!seatData) {
    return NextResponse.json(
      { error: `CRN ${crn} not found in ${subject} ${courseNumber} for current term` },
      { status: 404 }
    )
  }

  // Map Banner response fields to courses table columns.
  // faculty[0]?.displayName is the primary instructor display name.
  const professor =
    seatData.faculty.find((f) => f.primaryIndicator)?.displayName ??
    seatData.faculty[0]?.displayName ??
    null

  const courseRow = {
    crn: seatData.courseReferenceNumber,
    course_name: seatData.courseTitle,
    section: seatData.sequenceNumber,
    professor,
    seats_total: seatData.maximumEnrollment,
    seats_available: seatData.seatsAvailable,
    last_checked: new Date().toISOString(),
  }

  // Upsert into courses table (crn is the primary key).
  // createClient() is async in Next.js 15 — must await.
  const supabase = await createClient()
  const { error: upsertError } = await supabase
    .from('courses')
    .upsert(courseRow, { onConflict: 'crn' })

  if (upsertError) {
    // Log but don't fail the request — seat data is still valid even if cache write fails.
    console.error('[api/course] Supabase upsert error:', upsertError.message)
  }

  // Return only the fields specified in ROADMAP.md Phase 2 deliverables.
  return NextResponse.json({
    crn: courseRow.crn,
    course_name: courseRow.course_name,
    section: courseRow.section,
    professor: courseRow.professor,
    seats_total: courseRow.seats_total,
    seats_available: courseRow.seats_available,
  })
}
