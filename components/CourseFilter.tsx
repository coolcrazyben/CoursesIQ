'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const LEVELS = [
  { label: 'Intro (1000)',    value: '1' },
  { label: 'Intermediate (2000)', value: '2' },
  { label: 'Advanced (3000)', value: '3' },
  { label: 'Upper (4000+)',   value: '4' },
]

interface Props {
  subjects: string[]
}

export default function CourseFilter({ subjects }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  const [dept,      setDept]      = useState(sp.get('dept')      ?? '')
  const [level,     setLevel]     = useState(sp.get('level')     ?? '')
  const [available, setAvailable] = useState(sp.get('available') === 'true')

  function apply() {
    const p = new URLSearchParams()
    if (dept)      p.set('dept', dept)
    if (level)     p.set('level', level)
    if (available) p.set('available', 'true')
    router.push(`/course?${p.toString()}`)
  }

  function reset() {
    setDept('')
    setLevel('')
    setAvailable(false)
    router.push('/course')
  }

  return (
    <div className="mt-6 pt-6 border-t border-outline-variant space-y-5">
      <p className="text-[11px] font-bold text-secondary uppercase tracking-widest">Filters</p>

      {/* Department */}
      <div>
        <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1.5">
          Department
        </label>
        <div className="relative">
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/20 pr-8"
          >
            <option value="">All Departments</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ fontSize: 16 }}>
            expand_more
          </span>
        </div>
      </div>

      {/* Course Level */}
      <div>
        <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1.5">
          Course Level
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {LEVELS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setLevel(level === value ? '' : value)}
              className={`text-xs py-1.5 px-2 rounded-lg border font-medium transition-colors text-center ${
                level === value
                  ? 'bg-primary-container text-white border-primary-container'
                  : 'bg-white text-secondary border-gray-200 hover:border-primary-container/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
          Show Only Open Seats
        </label>
        <button
          role="switch"
          aria-checked={available}
          onClick={() => setAvailable(v => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${available ? 'bg-primary-container' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${available ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Actions */}
      <button
        onClick={apply}
        className="w-full bg-primary-container text-white py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Apply Filters
      </button>
      <button
        onClick={reset}
        className="w-full text-secondary text-sm hover:text-on-surface transition-colors"
      >
        Reset All
      </button>
    </div>
  )
}
