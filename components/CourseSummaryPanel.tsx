'use client'

import { useState, useEffect } from 'react'
import GradeBar from '@/components/GradeBar'

interface GradeRecord {
  a_count: number | null
  b_count: number | null
  c_count: number | null
  d_count: number | null
  f_count: number | null
  w_count: number | null
  instructor: string | null
}

interface RmpData {
  rating: number | null
  num_ratings: number | null
  difficulty: number | null
  rmp_id: string | null
  would_take_again: number | null
}

interface Props {
  subject: string
  course_number: string
  professor: string | null
}

function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1].toLowerCase()
}

function computeGpa(records: GradeRecord[]): number | null {
  let totalPoints = 0
  let totalCount = 0
  for (const r of records) {
    const a = r.a_count ?? 0
    const b = r.b_count ?? 0
    const c = r.c_count ?? 0
    const d = r.d_count ?? 0
    const f = r.f_count ?? 0
    totalPoints += a * 4.0 + b * 3.0 + c * 2.0 + d * 1.0
    totalCount += a + b + c + d + f
  }
  if (totalCount === 0) return null
  return totalPoints / totalCount
}

function aggregateCounts(records: GradeRecord[]) {
  return {
    a: records.reduce((s, r) => s + (r.a_count ?? 0), 0),
    b: records.reduce((s, r) => s + (r.b_count ?? 0), 0),
    c: records.reduce((s, r) => s + (r.c_count ?? 0), 0),
    d: records.reduce((s, r) => s + (r.d_count ?? 0), 0),
    f: records.reduce((s, r) => s + (r.f_count ?? 0), 0),
    w: records.reduce((s, r) => s + (r.w_count ?? 0), 0),
  }
}

export default function CourseSummaryPanel({ subject, course_number, professor }: Props) {
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([])
  const [rmp, setRmp] = useState<RmpData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const gradesP = fetch(`/api/grades?subject=${encodeURIComponent(subject)}&number=${encodeURIComponent(course_number)}`)
        .then(r => r.json()).catch(() => [])
      const rmpP = professor
        ? fetch(`/api/professor?name=${encodeURIComponent(professor)}`)
            .then(r => r.json()).catch(() => null)
        : Promise.resolve(null)
      const [gradeData, rmpData] = await Promise.all([gradesP, rmpP])
      if (cancelled) return
      setGradeRecords(Array.isArray(gradeData) ? gradeData : [])
      setRmp(rmpData?.error ? null : rmpData)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [subject, course_number, professor])

  // Filter to professor-specific records; fall back to course-wide
  const profLastName = professor ? getLastName(professor) : null
  const profRecords = profLastName
    ? gradeRecords.filter(r => r.instructor && getLastName(r.instructor) === profLastName)
    : []
  const displayRecords = profRecords.length > 0 ? profRecords : gradeRecords

  const gpa = computeGpa(displayRecords)
  const counts = aggregateCounts(displayRecords)
  const hasGrades = displayRecords.length > 0
  const hasRmp = rmp !== null && rmp.rating !== null

  if (!loading && !hasGrades && !hasRmp) return null

  const gpaLabel = loading ? '—' : gpa !== null ? gpa.toFixed(2) : '—'
  const ratingLabel = loading ? '—' : hasRmp ? rmp!.rating!.toFixed(1) : '—'
  const againLabel = loading
    ? '—'
    : hasRmp && rmp!.would_take_again !== null
      ? `${Math.round(rmp!.would_take_again)}%`
      : null

  return (
    <div className="mt-1.5">
      {/* Compact row */}
      <div className="flex items-center gap-1 text-[11px] text-gray-400">
        {(hasGrades || loading) && <span>GPA {gpaLabel}</span>}
        {(hasRmp || loading) && (
          <>
            {(hasGrades || loading) && <span className="mx-0.5">·</span>}
            <span>★ {ratingLabel} RMP</span>
            {againLabel && (
              <>
                <span className="mx-0.5">·</span>
                <span>{againLabel} again</span>
              </>
            )}
          </>
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          className="ml-1 text-gray-300 hover:text-gray-500 transition-colors leading-none"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▾' : '▸'}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="mt-1.5 space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
          {hasGrades && (
            <GradeBar
              a={counts.a} b={counts.b} c={counts.c}
              d={counts.d} f={counts.f} w={counts.w}
            />
          )}
          {hasRmp && (
            <div className="text-[11px] text-gray-500 space-y-0.5">
              <div className="flex flex-wrap gap-x-3">
                <span>Rating: <strong className="text-gray-700">{rmp!.rating!.toFixed(1)}/5</strong></span>
                {rmp!.difficulty !== null && (
                  <span>Difficulty: <strong className="text-gray-700">{rmp!.difficulty!.toFixed(1)}/5</strong></span>
                )}
                {rmp!.num_ratings !== null && (
                  <span>{rmp!.num_ratings} ratings</span>
                )}
                {rmp!.would_take_again !== null && (
                  <span>{Math.round(rmp!.would_take_again)}% would take again</span>
                )}
              </div>
              {rmp!.rmp_id && (
                <a
                  href={`https://www.ratemyprofessors.com/professor/${rmp!.rmp_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-container hover:underline"
                >
                  View on RMP →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
