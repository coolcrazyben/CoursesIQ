import GradeBar from './GradeBar'

export interface GradeRecord {
  id: string
  subject: string
  course_number: string
  section: string | null
  professor: string | null
  term: string
  a_count: number | null
  b_count: number | null
  c_count: number | null
  d_count: number | null
  f_count: number | null
  w_count: number | null
  total_students: number | null
  avg_gpa: number | null
}

export interface RMPData {
  rating: number | null
  num_ratings: number | null
  difficulty: number | null
  rmp_id: string | null
}

interface CourseCardProps {
  professor: string | null
  records: GradeRecord[]
  rmp?: RMPData | null
}

function aggregateRecords(records: GradeRecord[]) {
  let a = 0, b = 0, c = 0, d = 0, f = 0, w = 0, total = 0
  let gpaSum = 0, gpaCount = 0

  for (const r of records) {
    a += r.a_count ?? 0
    b += r.b_count ?? 0
    c += r.c_count ?? 0
    d += r.d_count ?? 0
    f += r.f_count ?? 0
    w += r.w_count ?? 0
    const t = r.total_students ?? 0
    total += t
    if (r.avg_gpa !== null && t > 0) {
      gpaSum += r.avg_gpa * t
      gpaCount += t
    }
  }

  const avg_gpa = gpaCount > 0 ? gpaSum / gpaCount : null
  return { a, b, c, d, f, w, total, avg_gpa }
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.5) return 'text-emerald-700 bg-emerald-50'
  if (gpa >= 3.0) return 'text-green-700 bg-green-50'
  if (gpa >= 2.5) return 'text-yellow-700 bg-yellow-50'
  return 'text-red-700 bg-red-50'
}

export default function CourseCard({ professor, records, rmp }: CourseCardProps) {
  const displayName = professor ?? 'Unknown Instructor'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const agg = aggregateRecords(records)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Maroon top accent bar per design system */}
      <div className="h-1 bg-primary-container" />

      <div className="p-5">
        {/* Professor header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container text-xs font-bold shrink-0 select-none">
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-on-surface leading-tight truncate">{displayName}</h3>
              {rmp?.rating && rmp.num_ratings ? (
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {rmp.rmp_id ? (
                    <a
                      href={`https://www.ratemyprofessors.com/professor/${rmp.rmp_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
                    >
                      <span>★</span>
                      {rmp.rating.toFixed(1)}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <span>★</span>
                      {rmp.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="text-[10px] text-secondary">
                    {rmp.num_ratings} ratings
                    {rmp.difficulty ? ` · ${rmp.difficulty.toFixed(1)}/5 difficulty` : ''}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* GPA badge */}
          {agg.avg_gpa !== null && (
            <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${gpaColor(agg.avg_gpa)}`}>
              {agg.avg_gpa.toFixed(2)} GPA
            </div>
          )}
        </div>

        <GradeBar
          a={agg.a}
          b={agg.b}
          c={agg.c}
          d={agg.d}
          f={agg.f}
          w={agg.w}
          total={agg.total}
        />

        {agg.total > 0 && (
          <p className="text-[11px] text-secondary mt-1.5">{agg.total.toLocaleString()} students · {records.length} section{records.length !== 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  )
}
