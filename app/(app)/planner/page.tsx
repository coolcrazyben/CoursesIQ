import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlannerClient from '@/components/PlannerClient'
import type { MeetingTime } from '@/lib/banner'
import { getUserPlan } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Planner — CoursesIQ' }

export interface Schedule {
  id: string
  name: string
  created_at: string
}

export interface ScheduleCourse {
  id: string
  schedule_id: string
  subject: string
  course_number: string
  professor: string | null
  notes: string | null
  added_at: string
  crn: string | null
  meeting_times: MeetingTime[] | null
  is_pending: boolean
}

export default async function PlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/planner')
  }

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .order('created_at', { ascending: true })

  const scheduleIds = (schedules ?? []).map((s: Schedule) => s.id)
  let courses: ScheduleCourse[] = []
  if (scheduleIds.length > 0) {
    const { data } = await supabase
      .from('schedule_courses')
      .select('*')
      .in('schedule_id', scheduleIds)
      .order('added_at', { ascending: true })
    courses = data ?? []
  }

  const plan = await getUserPlan(user!.id)

  return (
    <PlannerClient
      initialSchedules={schedules ?? []}
      initialCourses={courses}
      userId={user!.id}
      plan={plan}
    />
  )
}
