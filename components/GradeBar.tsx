interface GradeBarProps {
  a?: number | null
  b?: number | null
  c?: number | null
  d?: number | null
  f?: number | null
  w?: number | null
  total?: number | null
}

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',  // green-500
  B: '#84cc16',  // lime-400
  C: '#eab308',  // yellow-400
  D: '#f97316',  // orange-400
  F: '#ef4444',  // red-500
  W: '#d1d5db',  // neutral gray
}

export default function GradeBar({ a, b, c, d, f, w, total }: GradeBarProps) {
  const grades = [
    { label: 'A', count: a ?? 0 },
    { label: 'B', count: b ?? 0 },
    { label: 'C', count: c ?? 0 },
    { label: 'D', count: d ?? 0 },
    { label: 'F', count: f ?? 0 },
    { label: 'W', count: w ?? 0 },
  ]

  const sum = total ?? grades.reduce((s, g) => s + g.count, 0)
  if (sum === 0) return null

  return (
    <div className="space-y-1.5">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {grades.map(({ label, count }) => {
          if (!count) return null
          const pct = (count / sum) * 100
          return (
            <div
              key={label}
              title={`${label}: ${count} (${pct.toFixed(0)}%)`}
              className="first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, backgroundColor: GRADE_COLORS[label] }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {grades.map(({ label, count }) => {
          if (!count) return null
          const pct = ((count / sum) * 100).toFixed(0)
          return (
            <span key={label} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: GRADE_COLORS[label] }}
              />
              {label}: {pct}%
            </span>
          )
        })}
      </div>
    </div>
  )
}
