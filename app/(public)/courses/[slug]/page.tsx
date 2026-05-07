import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { getSectionsByCourse, BannerSeatData, MeetingTime } from '@/lib/banner'
import { parseCourseSlug } from '@/lib/slugs'
import { fillGaugeColors } from '@/lib/fill-gauge'
import GradeBar from '@/components/GradeBar'
import PublicPageTracker from '@/components/PublicPageTracker'
import ShareBar from '@/components/ShareBar'
import LeadCaptureForm from '@/components/LeadCaptureForm'
import { CURRENT_TERM_CODE } from '@/lib/constants'
import type { GradeRecord } from '@/components/CourseCard'

interface Props {
  params: Promise<{ slug: string }>
}

function formatTime(t: string): string {
  const h = parseInt(t.slice(0, 2), 10)
  const m = t.slice(2)
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

function buildMeetingDays(mt: MeetingTime): string {
  const days: [keyof MeetingTime, string][] = [
    ['monday', 'M'], ['tuesday', 'T'], ['wednesday', 'W'], ['thursday', 'R'], ['friday', 'F'],
  ]
  return days.filter(([k]) => mt[k] as boolean).map(([, v]) => v).join('') || 'TBA'
}

function termLabel(code: string): string {
  const tt = code.slice(4)
  const year = code.slice(0, 4)
  if (tt === '10') return `Spring ${year}`
  if (tt === '20') return `Summer ${year}`
  if (tt === '30') return `Fall ${year}`
  return code
}

const TERM_NAME_RE = /^(fall|spring|summer)\s+\d{4}$/i

function groupByProfessor(records: GradeRecord[]): Map<string, GradeRecord[]> {
  const map = new Map<string, GradeRecord[]>()
  for (const r of records) {
    const k = r.professor ?? ''
    if (TERM_NAME_RE.test(k)) continue
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return map
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const parsed = parseCourseSlug(slug)
  if (!parsed) return { title: 'Course — CoursesIQ' }
  const { subject, courseNumber } = parsed
  const title = `${subject} ${courseNumber} — Grade Distribution & Sections | CoursesIQ`
  const description = `View grade distributions, professor ratings, and live section seat availability for ${subject} ${courseNumber} at Mississippi State University.`
  const ogUrl = `https://coursesiq.com/api/og?subject=${subject}&number=${courseNumber}`
  return {
    title,
    description,
    openGraph: { title, description, url: `https://coursesiq.com/courses/${slug}`, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicCoursePage({ params }: Props) {
  const { slug } = await params
  const parsed = parseCourseSlug(slug)
  if (!parsed) notFound()

  const { subject, courseNumber } = parsed

  const [{ data: gradeRows }, sections] = await Promise.all([
    adminClient.from('grade_distributions').select('*')
      .eq('subject', subject).eq('course_number', courseNumber).order('term', { ascending: false }),
    getSectionsByCourse(subject, courseNumber).catch(() => [] as BannerSeatData[]),
  ])

  const records: GradeRecord[] = gradeRows ?? []
  const groups = groupByProfessor(records)

  const avgGpa = (() => {
    const valid = records.filter(r => r.avg_gpa !== null && (r.total_students ?? 0) > 0)
    if (!valid.length) return null
    const total = valid.reduce((s, r) => s + (r.total_students ?? 0), 0)
    const sum = valid.reduce((s, r) => s + r.avg_gpa! * (r.total_students ?? 0), 0)
    return (sum / total).toFixed(2)
  })()

  const label = `${subject} ${courseNumber}`
  const pageUrl = `https://coursesiq.com/courses/${slug}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PublicPageTracker page_type="course" slug={slug} subject={subject} course_number={courseNumber} />

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#5D1725] uppercase tracking-widest mb-1">
          Mississippi State University
        </p>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{label}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {avgGpa && (
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{avgGpa}</span> avg GPA
            </span>
          )}
          {records.length > 0 && (
            <span>{groups.size} instructor{groups.size !== 1 ? 's' : ''}</span>
          )}
          {sections.length > 0 && (
            <span>{sections.length} section{sections.length !== 1 ? 's' : ''} this term</span>
          )}
        </div>
      </div>

      {/* Watchlist CTA */}
      <div className="bg-[#5D1725]/5 border border-[#5D1725]/20 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-700">
          Want to track seat availability and waitlist position?
        </p>
        <Link
          href={`/auth/login?next=/dashboard`}
          className="shrink-0 bg-[#5D1725] text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Sign in to track
        </Link>
      </div>

      {/* Live sections */}
      {sections.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Current Sections — {termLabel(CURRENT_TERM_CODE)}
          </h2>
          <div className="space-y-2">
            {sections.map(s => {
              const instructor = s.faculty?.find(f => f.primaryIndicator)?.displayName ?? s.faculty?.[0]?.displayName ?? 'TBA'
              const mt = s.meetingsFaculty?.[0]?.meetingTime
              const days = mt ? buildMeetingDays(mt) : 'TBA'
              const time = mt?.beginTime && mt?.endTime
                ? `${formatTime(mt.beginTime)}–${formatTime(mt.endTime)}`
                : 'TBA'
              const gauge = fillGaugeColors(s.seatsAvailable, s.maximumEnrollment, s.waitCount)
              return (
                <div key={s.courseReferenceNumber} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{instructor}</p>
                      <p className="text-xs text-gray-500">{days} · {time} · CRN {s.courseReferenceNumber}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-gray-900">{s.seatsAvailable}/{s.maximumEnrollment}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${gauge.badge}`}>{gauge.label}</span>
                    </div>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${gauge.track}`}>
                    <div className={`h-full rounded-full ${gauge.bar}`} style={{ width: `${Math.max(2, Math.min(100, gauge.fillPct))}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Grade distributions by professor */}
      {records.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Grade Distribution by Instructor
          </h2>
          <div className="space-y-4">
            {[...groups.entries()].map(([prof, recs]) => {
              const totStudents = recs.reduce((s, r) => s + (r.total_students ?? 0), 0)
              const wavgGpa = (() => {
                const v = recs.filter(r => r.avg_gpa !== null && (r.total_students ?? 0) > 0)
                if (!v.length) return null
                const tot = v.reduce((s, r) => s + (r.total_students ?? 0), 0)
                const sum = v.reduce((s, r) => s + r.avg_gpa! * (r.total_students ?? 0), 0)
                return (sum / tot).toFixed(2)
              })()
              const agg = recs.reduce(
                (acc, r) => ({
                  a: acc.a + (r.a_count ?? 0),
                  b: acc.b + (r.b_count ?? 0),
                  c: acc.c + (r.c_count ?? 0),
                  d: acc.d + (r.d_count ?? 0),
                  f: acc.f + (r.f_count ?? 0),
                  w: acc.w + (r.w_count ?? 0),
                }),
                { a: 0, b: 0, c: 0, d: 0, f: 0, w: 0 }
              )
              return (
                <div key={prof || '__unknown__'} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{prof || 'Unknown Instructor'}</p>
                      <p className="text-xs text-gray-500">{totStudents.toLocaleString()} students</p>
                    </div>
                    {wavgGpa && (
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900">{wavgGpa}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Avg GPA</p>
                      </div>
                    )}
                  </div>
                  <GradeBar
                    a={agg.a} b={agg.b} c={agg.c} d={agg.d} f={agg.f} w={agg.w}
                    total={totStudents}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {records.length === 0 && sections.length === 0 && (
        <div className="text-center py-16 text-gray-500">No data available for {label}.</div>
      )}

      <ShareBar url={pageUrl} title={`${label} grade distribution and sections at MSU`} />
      <LeadCaptureForm isAuthenticated={false} pageSlug={slug} />
    </div>
  )
}
