import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { professorSlug } from '@/lib/slugs'
import GradeBar from '@/components/GradeBar'
import PublicPageTracker from '@/components/PublicPageTracker'
import ShareBar from '@/components/ShareBar'
import LeadCaptureForm from '@/components/LeadCaptureForm'
import type { GradeRecord } from '@/components/CourseCard'

interface Props {
  params: Promise<{ slug: string }>
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const name = titleCase(slug.replace(/-/g, ' '))
  const title = `${name} — Professor Grades & Ratings | CoursesIQ`
  const description = `View grade distributions and student data for ${name} at Mississippi State University.`
  const ogUrl = `https://coursesiq.com/api/og?professor=${encodeURIComponent(name)}`
  return {
    title,
    description,
    openGraph: { title, description, url: `https://coursesiq.com/professors/${slug}`, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicProfessorPage({ params }: Props) {
  const { slug } = await params
  const guessedName = titleCase(slug.replace(/-/g, ' '))

  // Query for records matching this professor name (case-insensitive)
  const { data: records } = await adminClient
    .from('grade_distributions')
    .select('*')
    .ilike('professor', guessedName)
    .order('subject')
    .order('course_number')

  if (!records || records.length === 0) notFound()

  const canonicalName = (records[0] as GradeRecord).professor ?? guessedName

  // Group by course
  const courseMap = new Map<string, GradeRecord[]>()
  for (const r of records as GradeRecord[]) {
    const key = `${r.subject}|${r.course_number}`
    if (!courseMap.has(key)) courseMap.set(key, [])
    courseMap.get(key)!.push(r)
  }

  const totalStudents = (records as GradeRecord[]).reduce((s, r) => s + (r.total_students ?? 0), 0)
  const pageUrl = `https://coursesiq.com/professors/${slug}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PublicPageTracker page_type="professor" slug={slug} professor={canonicalName} />

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#5D1725] uppercase tracking-widest mb-1">
          Mississippi State University
        </p>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{canonicalName}</h1>
        <p className="text-sm text-gray-600">
          {courseMap.size} course{courseMap.size !== 1 ? 's' : ''} · {totalStudents.toLocaleString()} total students
        </p>
      </div>

      {/* Courses */}
      <div className="space-y-4 mb-10">
        {[...courseMap.entries()].map(([key, recs]) => {
          const [subject, courseNumber] = key.split('|')
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
          const courseSlugVal = `${subject.toLowerCase()}-${courseNumber.toLowerCase()}`
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <a
                    href={`/courses/${courseSlugVal}`}
                    className="font-bold text-gray-900 hover:text-[#5D1725] transition-colors"
                  >
                    {subject} {courseNumber}
                  </a>
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

      <ShareBar url={pageUrl} title={`${canonicalName} grade data at MSU`} />
      <LeadCaptureForm isAuthenticated={false} pageSlug={`professor-${slug}`} />
    </div>
  )
}
