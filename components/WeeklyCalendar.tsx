'use client'

import type { ScheduleCourse } from '@/app/(app)/planner/page'
import type { MeetingTime } from '@/lib/banner'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

const CALENDAR_START = 8 * 60   // 8am
const CALENDAR_END   = 21 * 60  // 9pm
const TOTAL_MINS     = CALENDAR_END - CALENDAR_START
const DAYS: { label: string; key: DayKey }[] = [
  { label: 'MON', key: 'monday'    },
  { label: 'TUE', key: 'tuesday'   },
  { label: 'WED', key: 'wednesday' },
  { label: 'THU', key: 'thursday'  },
  { label: 'FRI', key: 'friday'    },
]
const PALETTE = ['#601020', '#1d4ed8', '#15803d', '#b45309', '#7c3aed', '#be185d']

function timeToMin(t: string): number {
  return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2), 10)
}

function formatHourLabel(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:00 ${ampm}`
}

function formatTimeShort(t: string): string {
  const h = parseInt(t.slice(0, 2), 10)
  const m = t.slice(2)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m}${ampm}`
}

function coursesConflict(c1: ScheduleCourse, c2: ScheduleCourse): boolean {
  const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  for (const mt1 of c1.meeting_times ?? []) {
    for (const mt2 of c2.meeting_times ?? []) {
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

interface Props {
  courses: ScheduleCourse[]
  pendingCourses?: ScheduleCourse[]
}

export default function WeeklyCalendar({ courses, pendingCourses = [] }: Props) {
  const hours: number[] = []
  for (let h = 8; h <= 21; h++) hours.push(h)

  // Compute which pending courses conflict with active ones
  const conflictIds = new Set<string>()
  for (const p of pendingCourses) {
    for (const a of courses) {
      if (coursesConflict(p, a)) { conflictIds.add(p.id); break }
    }
  }

  function renderBlocks(list: ScheduleCourse[], dayKey: DayKey, isPending: boolean) {
    return list.map((course, idx) => {
      if (!course.meeting_times) return null
      const color  = isPending ? '#94a3b8' : PALETTE[idx % PALETTE.length]
      const hasConflict = isPending && conflictIds.has(course.id)

      return course.meeting_times
        .filter((mt: MeetingTime) => mt[dayKey] && mt.beginTime && mt.endTime)
        .map((mt: MeetingTime, mtIdx: number) => {
          const startMin = timeToMin(mt.beginTime!)
          if (startMin < CALENDAR_START || startMin >= CALENDAR_END) return null
          const top    = startMin - CALENDAR_START
          const height = Math.min(timeToMin(mt.endTime!) - startMin, CALENDAR_END - startMin)
          return (
            <div
              key={`${course.id}-${mtIdx}`}
              className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden text-white ${isPending ? 'opacity-75' : ''}`}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                backgroundColor: hasConflict ? '#ef4444' : color,
                border: isPending ? '2px dashed rgba(255,255,255,0.6)' : 'none',
              }}
              title={`${course.subject} ${course.course_number}${mt.building ? ` · ${mt.building} ${mt.room}` : ''}`}
            >
              {hasConflict ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 12 }}>warning</span>
                  <p className="text-[9px] font-bold">CONFLICT</p>
                </div>
              ) : (
                <div className="p-1">
                  <p className="text-[10px] font-bold leading-tight truncate">
                    {course.subject} {course.course_number}
                  </p>
                  {height >= 36 && (
                    <p className="text-[9px] opacity-80 truncate">
                      {formatTimeShort(mt.beginTime!)}–{formatTimeShort(mt.endTime!)}
                    </p>
                  )}
                  {height >= 52 && mt.building && (
                    <p className="text-[9px] opacity-70 truncate">{mt.building} {mt.room}</p>
                  )}
                </div>
              )}
            </div>
          )
        })
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden select-none">
      {/* Day header */}
      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '64px repeat(5, 1fr)' }}>
        <div className="border-r border-gray-100" />
        {DAYS.map(d => (
          <div key={d.key} className="text-center text-[11px] font-bold text-secondary py-2.5 border-l border-gray-100 tracking-widest uppercase">
            {d.label}
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="grid overflow-y-auto" style={{ gridTemplateColumns: '64px repeat(5, 1fr)', height: '520px' }}>
        {/* Time label column */}
        <div className="relative border-r border-gray-100" style={{ height: `${TOTAL_MINS}px` }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute right-2 text-[9px] text-gray-400 leading-none whitespace-nowrap font-medium"
              style={{ top: `${(h * 60 - CALENDAR_START) - 5}px` }}
            >
              {formatHourLabel(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map(({ key: dayKey }) => (
          <div key={dayKey} className="relative border-l border-gray-100" style={{ height: `${TOTAL_MINS}px` }}>
            {/* Hour lines */}
            {hours.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0"
                style={{ top: `${h * 60 - CALENDAR_START}px`, borderTop: h % 1 === 0 ? '1px solid #f1f5f9' : undefined }}
              />
            ))}
            {/* Half-hour lines */}
            {hours.map(h => (
              <div
                key={`${h}-half`}
                className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                style={{ top: `${h * 60 + 30 - CALENDAR_START}px` }}
              />
            ))}
            {/* Active course blocks */}
            {renderBlocks(courses, dayKey, false)}
            {/* Pending course blocks */}
            {renderBlocks(pendingCourses, dayKey, true)}
          </div>
        ))}
      </div>
    </div>
  )
}
