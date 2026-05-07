import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { courseSlug } from '@/lib/slugs'
import PublicPageTracker from '@/components/PublicPageTracker'
import ShareBar from '@/components/ShareBar'
import LeadCaptureForm from '@/components/LeadCaptureForm'

interface Props {
  params: Promise<{ dept: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dept } = await params
  const subject = dept.toUpperCase()
  const title = `${subject} Department — Courses & Grades | CoursesIQ`
  const description = `Browse all ${subject} courses at Mississippi State University with grade distributions and section data.`
  const ogUrl = `https://coursesiq.com/api/og?dept=${subject}`
  return {
    title,
    description,
    openGraph: { title, description, url: `https://coursesiq.com/departments/${dept}`, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicDepartmentPage({ params }: Props) {
  const { dept } = await params
  const subject = dept.toUpperCase()

  const { data: rows } = await adminClient
    .from('grade_distributions')
    .select('subject, course_number, avg_gpa, total_students')
    .eq('subject', subject)
    .order('course_number')

  if (!rows || rows.length === 0) notFound()

  // Aggregate per course
  type CourseAgg = { subject: string; course_number: string; total_students: number; gpa_sum: number; gpa_count: number }
  const courseMap = new Map<string, CourseAgg>()
  for (const r of rows) {
    const key = r.course_number
    if (!courseMap.has(key)) {
      courseMap.set(key, { subject: r.subject, course_number: r.course_number, total_students: 0, gpa_sum: 0, gpa_count: 0 })
    }
    const agg = courseMap.get(key)!
    agg.total_students += r.total_students ?? 0
    if (r.avg_gpa !== null && (r.total_students ?? 0) > 0) {
      agg.gpa_sum += r.avg_gpa * (r.total_students ?? 0)
      agg.gpa_count += r.total_students ?? 0
    }
  }

  const courses = [...courseMap.values()].sort((a, b) => a.course_number.localeCompare(b.course_number))
  const pageUrl = `https://coursesiq.com/departments/${dept}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PublicPageTracker page_type="department" slug={dept} subject={subject} />

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#5D1725] uppercase tracking-widest mb-1">
          Mississippi State University
        </p>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{subject} Department</h1>
        <p className="text-sm text-gray-600">{courses.length} courses available</p>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
        {courses.map(c => {
          const avgGpa = c.gpa_count > 0 ? (c.gpa_sum / c.gpa_count).toFixed(2) : null
          const slug = courseSlug(c.subject, c.course_number)
          return (
            <Link
              key={c.course_number}
              href={`/courses/${slug}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#5D1725]/40 hover:shadow-md transition-all group"
            >
              <p className="text-xs text-gray-500 font-semibold mb-0.5">{c.subject}</p>
              <p className="font-bold text-gray-900 group-hover:text-[#5D1725] transition-colors">{c.course_number}</p>
              {avgGpa && (
                <p className="text-xs text-gray-400 mt-1">GPA {avgGpa}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5">{c.total_students.toLocaleString()} students</p>
            </Link>
          )
        })}
      </div>

      <ShareBar url={pageUrl} title={`${subject} courses at MSU — grades and data`} />
      <LeadCaptureForm isAuthenticated={false} pageSlug={`dept-${dept}`} />
    </div>
  )
}
