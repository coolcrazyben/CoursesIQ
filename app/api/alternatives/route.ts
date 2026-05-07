export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { getSectionsByCourse } from '@/lib/banner'
import type { MeetingTime, BannerSeatData } from '@/lib/banner'
import type { ScheduleCourse } from '@/app/(app)/planner/page'

export interface AlternativeSection {
  crn: string
  section: string
  instructor: string | null
  seatsAvailable: number
  maximumEnrollment: number
  waitCount: number
  meetingTimes: MeetingTime[]
  rmpRating: number | null
  avgGpa: number | null
}

// ── Conflict check (mirrors PlannerClient.tsx logic) ──────────────────────────

function timeToMin(t: string): number {
  return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2), 10)
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const

function meetingsConflict(mts1: MeetingTime[], mts2: MeetingTime[]): boolean {
  for (const mt1 of mts1) {
    for (const mt2 of mts2) {
      if (!DAY_KEYS.some(d => mt1[d] && mt2[d])) continue
      if (mt1.beginTime && mt1.endTime && mt2.beginTime && mt2.endTime) {
        const s1 = timeToMin(mt1.beginTime), e1 = timeToMin(mt1.endTime)
        const s2 = timeToMin(mt2.beginTime), e2 = timeToMin(mt2.endTime)
        if (s1 < e2 && s2 < e1) return true
      }
    }
  }
  return false
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const subject    = searchParams.get('subject')
  const number     = searchParams.get('number')
  const scheduleId = searchParams.get('scheduleId')
  const excludeCrn = searchParams.get('excludeCrn') // current conflicted section's CRN

  if (!subject || !number || !scheduleId) {
    return NextResponse.json({ error: 'Missing required params: subject, number, scheduleId' }, { status: 400 })
  }

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify schedule belongs to user
  const { data: schedule } = await adminClient
    .from('schedules')
    .select('id, user_id')
    .eq('id', scheduleId)
    .single()
  if (!schedule || schedule.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch active (non-pending) courses in this schedule, excluding the course being replaced
  const { data: existingRows } = await adminClient
    .from('schedule_courses')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('is_pending', false)

  const subjectUpper = subject.toUpperCase()
  const existingCourses: ScheduleCourse[] = (existingRows ?? []).filter(
    (c: ScheduleCourse) => !(c.subject === subjectUpper && c.course_number === number)
  )

  // Fetch all Banner sections for the target course
  let sections: BannerSeatData[] = []
  try {
    sections = await getSectionsByCourse(subject, number)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch sections from Banner' }, { status: 502 })
  }

  // Filter: exclude the current CRN and check for time conflicts
  const compatible = sections.filter(s => {
    if (s.courseReferenceNumber === excludeCrn) return false
    const sectionMTs = s.meetingsFaculty?.map(m => m.meetingTime) ?? []
    if (sectionMTs.length === 0) return true // TBA — no conflict possible
    for (const existing of existingCourses) {
      if (!existing.meeting_times?.length) continue
      if (meetingsConflict(sectionMTs, existing.meeting_times)) return false
    }
    return true
  })

  // Fetch RMP ratings from professors cache (match by name_normalized)
  const instructorNames = [...new Set(
    compatible
      .map(s => s.faculty?.find(f => f.primaryIndicator)?.displayName ?? s.faculty?.[0]?.displayName)
      .filter((n): n is string => Boolean(n))
  )]

  const rmpMap = new Map<string, number | null>()
  if (instructorNames.length > 0) {
    const normalized = instructorNames.map(n => n.toLowerCase().trim())
    const { data: profRows } = await adminClient
      .from('professors')
      .select('name_normalized, rating')
      .in('name_normalized', normalized)
    for (const row of profRows ?? []) {
      rmpMap.set(row.name_normalized, row.rating ?? null)
    }
  }

  // Fetch avg GPA from grade_distributions
  // Banner displayName is "Last, First"; grade_distributions uses "First Last" (Power BI format)
  const { data: gradeRows } = await adminClient
    .from('grade_distributions')
    .select('professor, avg_gpa, total_students')
    .eq('subject', subjectUpper)
    .eq('course_number', number)
    .not('avg_gpa', 'is', null)

  // Weighted avg GPA per professor (Power BI "First Last" format)
  const gpaMap = new Map<string, number>()
  if (gradeRows?.length) {
    const byProf = new Map<string, { sum: number; count: number }>()
    for (const row of gradeRows) {
      if (!row.professor || row.avg_gpa == null || !row.total_students) continue
      const cur = byProf.get(row.professor) ?? { sum: 0, count: 0 }
      byProf.set(row.professor, { sum: cur.sum + row.avg_gpa * row.total_students, count: cur.count + row.total_students })
    }
    for (const [prof, { sum, count }] of byProf) {
      gpaMap.set(prof.toLowerCase().trim(), parseFloat((sum / count).toFixed(2)))
    }
  }

  // Helper: convert "Last, First" → "First Last" for GPA map lookup
  function toFirstLast(displayName: string): string {
    const parts = displayName.split(',')
    return parts.length === 2 ? `${parts[1].trim()} ${parts[0].trim()}` : displayName
  }

  // Build enriched result
  const result: AlternativeSection[] = compatible.map(s => {
    const instructor = s.faculty?.find(f => f.primaryIndicator)?.displayName ?? s.faculty?.[0]?.displayName ?? null
    const normKey = instructor?.toLowerCase().trim() ?? null
    const rmpRating = normKey ? (rmpMap.get(normKey) ?? null) : null
    const gpaKey = instructor ? toFirstLast(instructor).toLowerCase().trim() : null
    const avgGpa = gpaKey ? (gpaMap.get(gpaKey) ?? null) : null
    return {
      crn: s.courseReferenceNumber,
      section: s.sequenceNumber,
      instructor,
      seatsAvailable: s.seatsAvailable,
      maximumEnrollment: s.maximumEnrollment,
      waitCount: s.waitCount,
      meetingTimes: s.meetingsFaculty?.map(m => m.meetingTime) ?? [],
      rmpRating,
      avgGpa,
    }
  })

  // Sort: open seats first → RMP desc → GPA desc
  result.sort((a, b) => {
    const aOpen = a.seatsAvailable > 0 ? 1 : 0
    const bOpen = b.seatsAvailable > 0 ? 1 : 0
    if (bOpen !== aOpen) return bOpen - aOpen
    const aRmp = a.rmpRating ?? -1, bRmp = b.rmpRating ?? -1
    if (bRmp !== aRmp) return bRmp - aRmp
    return (b.avgGpa ?? 0) - (a.avgGpa ?? 0)
  })

  return NextResponse.json(result)
}
