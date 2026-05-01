import { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import CourseCard, { GradeRecord, RMPData } from '@/components/CourseCard'
import CourseSearch from '@/components/CourseSearch'
import CourseFilter from '@/components/CourseFilter'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Course Search — CoursesIQ' }

interface PageProps {
  searchParams: Promise<{ subject?: string; number?: string; dept?: string; level?: string; available?: string }>
}

async function fetchGrades(subject: string, number: string): Promise<GradeRecord[]> {
  const { data } = await adminClient.from('grade_distributions').select('*')
    .eq('subject', subject.toUpperCase()).eq('course_number', number).order('term', { ascending: false })
  return data ?? []
}

async function fetchRMP(name: string, baseUrl: string): Promise<RMPData | null> {
  try {
    const res = await fetch(`${baseUrl}/api/professor?name=${encodeURIComponent(name)}`, { next: { revalidate: 86400 } })
    return res.ok ? res.json() : null
  } catch { return null }
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

export default async function CoursePage({ searchParams }: PageProps) {
  const { subject, number, dept, level, available } = await searchParams
  const hasSearch = Boolean(subject && number)
  const hasFilter = Boolean(dept || level)

  // Fetch distinct subjects for the filter dropdown
  const { data: subjectRows } = await adminClient.rpc('get_distinct_subjects')
  const subjects: string[] = (subjectRows ?? []).map((r: { subject: string }) => r.subject)

  // Fetch grade data for specific course
  let records: GradeRecord[] = []
  let groups = new Map<string, GradeRecord[]>()
  let rmpData = new Map<string, RMPData | null>()

  if (hasSearch && subject && number) {
    records = await fetchGrades(subject, number)
    groups = groupByProfessor(records)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const names = [...groups.keys()].filter(Boolean)
    const results = await Promise.all(names.map(async n => [n, await fetchRMP(n, base)] as [string, RMPData | null]))
    rmpData = new Map(results)
  }

  // Fetch filtered course list when no specific course is selected
  type CourseRow = { subject: string; course_number: string }
  let filteredCourses: CourseRow[] = []
  if (!hasSearch && hasFilter) {
    let query = adminClient
      .from('grade_distributions')
      .select('subject, course_number')
      .order('subject')
      .order('course_number')
    if (dept) query = query.eq('subject', dept)
    if (level) query = query.like('course_number', `${level}%`)
    const { data: rows } = await query.limit(500)
    const seen = new Set<string>()
    filteredCourses = (rows ?? []).filter((r: CourseRow) => {
      const key = `${r.subject}|${r.course_number}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    // If "available" filter is on, note it's live data — we skip since Banner calls are per-course
  }

  const label = subject && number ? `${subject.toUpperCase()} ${number}` : ''

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left panel */}
      <aside className="w-72 border-r border-outline-variant bg-white p-6 overflow-y-auto shrink-0">
        <h4 className="text-h3 text-primary-container mb-4">Course Search</h4>
        <CourseSearch />
        {hasSearch && (
          <Link href="/course" className="block w-full text-center py-2 mt-3 text-sm text-secondary hover:underline">Reset</Link>
        )}

        {/* Instructor list when course is selected */}
        {hasSearch && records.length > 0 && (
          <div className="mt-6 pt-6 border-t border-outline-variant">
            <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold mb-3">Instructors</p>
            <div className="space-y-2">
              {[...groups.entries()].map(([prof]) => (
                <div key={prof || 'unknown'} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-6 h-6 bg-primary-container rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {(prof || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-on-surface truncate">{prof || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter panel — shown when not on a specific course */}
        {!hasSearch && (
          <Suspense fallback={null}>
            <CourseFilter subjects={subjects} />
          </Suspense>
        )}
      </aside>

      {/* Main results */}
      <section className="flex-1 overflow-y-auto bg-surface-container-low">
        {!hasSearch && !hasFilter ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary-container mb-4">
              <span className="material-symbols-outlined text-3xl">analytics</span>
            </div>
            <h3 className="text-h2 text-on-surface mb-2">Search or Filter Courses</h3>
            <p className="text-body-md text-secondary max-w-sm">
              Search by course code above, or use the filters to browse by department and level.
            </p>
          </div>
        ) : !hasSearch && hasFilter ? (
          /* Filtered course list */
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">
                  {dept || 'All Departments'}{level ? ` · ${level}000-level` : ''}
                  {available === 'true' ? ' · Open seats only' : ''}
                </p>
                <h2 className="text-h1 text-on-surface">{filteredCourses.length} Courses Found</h2>
              </div>
            </div>
            {filteredCourses.length === 0 ? (
              <p className="text-secondary text-center py-16">No courses match your filters.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCourses.map(c => (
                  <Link
                    key={`${c.subject}|${c.course_number}`}
                    href={`/course?subject=${encodeURIComponent(c.subject)}&number=${encodeURIComponent(c.course_number)}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-container/40 hover:shadow-md transition-all group"
                  >
                    <div className="w-8 h-8 bg-primary-fixed rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary-container transition-colors">
                      <span className="material-symbols-outlined text-primary-container group-hover:text-white transition-colors" style={{ fontSize: 16 }}>school</span>
                    </div>
                    <p className="text-xs text-secondary font-semibold mb-0.5">{c.subject}</p>
                    <p className="font-bold text-on-surface">{c.course_number}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-h2 text-on-surface mb-2">No data found for {label}</h3>
            <p className="text-body-md text-secondary">No historical grade data available yet for this course.</p>
          </div>
        ) : (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary-container font-bold text-sm tracking-wider">{label} · MISSISSIPPI STATE</span>
                </div>
                <h2 className="text-h1 text-on-surface">Grade Distribution</h2>
              </div>
              <Link
                href={`/?subject=${subject}&number=${number}#alert-form`}
                className="bg-primary-container text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_alert</span>
                Set Up Alert
              </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden">
                <div className="h-1 bg-primary-container" />
                <div className="p-5">
                  <p className="text-label-sm text-secondary mb-1 uppercase">Total Records</p>
                  <p className="font-black text-on-surface" style={{ fontSize: 32 }}>{records.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden">
                <div className="h-1 bg-primary-container" />
                <div className="p-5">
                  <p className="text-label-sm text-secondary mb-1 uppercase">Instructors</p>
                  <p className="font-black text-on-surface" style={{ fontSize: 32 }}>{groups.size}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden">
                <div className="h-1 bg-primary-container" />
                <div className="p-5">
                  <p className="text-label-sm text-secondary mb-1 uppercase">Avg GPA</p>
                  <p className="font-black text-on-surface" style={{ fontSize: 32 }}>
                    {(() => {
                      const valid = records.filter(r => r.avg_gpa !== null && (r.total_students ?? 0) > 0)
                      if (!valid.length) return 'N/A'
                      const total = valid.reduce((s, r) => s + (r.total_students ?? 0), 0)
                      const sum = valid.reduce((s, r) => s + r.avg_gpa! * (r.total_students ?? 0), 0)
                      return (sum / total).toFixed(2)
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[...groups.entries()].map(([prof, recs]) => (
                <CourseCard key={prof || '__unknown__'} professor={prof || null} records={recs} rmp={rmpData.get(prof) ?? null} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
