// lib/banner.ts uses axios + tough-cookie (Node.js modules) — must use nodejs runtime.
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSectionsByCourse, MeetingTime } from '@/lib/banner'

function buildDaysString(mt: MeetingTime): string {
  const map: [keyof MeetingTime, string][] = [
    ['monday', 'M'],
    ['tuesday', 'T'],
    ['wednesday', 'W'],
    ['thursday', 'R'],
    ['friday', 'F'],
  ]
  return map.filter(([k]) => mt[k] as boolean).map(([, v]) => v).join('')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subject = searchParams.get('subject')
  const number = searchParams.get('number')
  const term = searchParams.get('term') ?? undefined

  if (!subject || !number) {
    return NextResponse.json({ error: 'subject and number are required' }, { status: 400 })
  }

  try {
    const sections = await getSectionsByCourse(subject, number, term)

    const result = sections.map(s => {
      const primaryFaculty = s.faculty?.find(f => f.primaryIndicator) ?? s.faculty?.[0] ?? null
      const meetingTimes = (s.meetingsFaculty ?? []).map(mf => {
        const mt = mf.meetingTime
        return {
          days: buildDaysString(mt),
          beginTime: mt.beginTime ?? '',
          endTime: mt.endTime ?? '',
          building: mt.building,
          room: mt.room,
          raw: mt,
        }
      })

      return {
        crn: s.courseReferenceNumber,
        section: s.sequenceNumber,
        title: s.courseTitle,
        instructor: primaryFaculty?.displayName ?? null,
        seatsAvailable: s.seatsAvailable,
        maximumEnrollment: s.maximumEnrollment,
        meetingTimes,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[sections] error:', err)
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 })
  }
}
