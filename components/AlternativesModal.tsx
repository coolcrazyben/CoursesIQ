'use client'

import { useState, useEffect } from 'react'
import type { MeetingTime } from '@/lib/banner'
import type { AlternativeSection } from '@/app/api/alternatives/route'

export type { AlternativeSection }

interface Props {
  subject: string
  courseNumber: string
  scheduleId: string
  currentCrn: string | null
  onSwap: (section: AlternativeSection) => Promise<void>
  onClose: () => void
}

function formatTime(t: string): string {
  const h = parseInt(t.slice(0, 2), 10)
  return `${h % 12 || 12}:${t.slice(2)}${h >= 12 ? 'pm' : 'am'}`
}

function meetingLabel(mt: MeetingTime): string {
  const days = (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const)
    .map((d, i) => mt[d] && ['M', 'T', 'W', 'R', 'F'][i])
    .filter(Boolean).join('')
  if (!days) return 'TBA'
  const time = mt.beginTime && mt.endTime
    ? ` ${formatTime(mt.beginTime)}–${formatTime(mt.endTime)}`
    : ''
  return `${days}${time}`
}

export default function AlternativesModal({ subject, courseNumber, scheduleId, currentCrn, onSwap, onClose }: Props) {
  const [sections, setSections] = useState<AlternativeSection[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [swapping, setSwapping] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const params = new URLSearchParams({ subject, number: courseNumber, scheduleId })
        if (currentCrn) params.set('excludeCrn', currentCrn)
        const res = await fetch(`/api/alternatives?${params}`)
        if (!res.ok) throw new Error(`${res.status}`)
        setSections(await res.json())
      } catch {
        setError('Failed to load alternatives. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [subject, courseNumber, scheduleId, currentCrn])

  async function handleSwap(sec: AlternativeSection) {
    setSwapping(sec.crn)
    try {
      await onSwap(sec)
      onClose()
    } catch {
      setSwapping(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">
              Alternative Sections — {subject} {courseNumber}
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Conflict-free · ranked by rating &amp; GPA
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 20 }}>progress_activity</span>
              Finding conflict-free sections…
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm text-center py-8">{error}</p>
          ) : sections.length === 0 ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-gray-300 text-4xl block mb-2">search_off</span>
              <p className="text-sm text-gray-500">No conflict-free alternatives found for this term.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sections.map((sec, idx) => {
                const isOpen     = sec.seatsAvailable > 0
                const timeSummary = sec.meetingTimes.map(meetingLabel).filter(t => t !== 'TBA').join(', ') || 'TBA'
                const isSwapping  = swapping === sec.crn

                return (
                  <div
                    key={sec.crn}
                    className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:border-primary-container/30 hover:bg-gray-50 transition-colors"
                  >
                    {/* Rank badge */}
                    <div className="w-6 h-6 rounded-full bg-primary-fixed text-primary-container text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-gray-500">§{sec.section}</span>
                        {sec.instructor && (
                          <span className="text-sm font-medium text-gray-800 truncate">{sec.instructor}</span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-0.5">{timeSummary}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {sec.rmpRating !== null && (
                          <span className="text-[11px] text-yellow-600 font-semibold flex items-center gap-0.5">
                            <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>star</span>
                            {sec.rmpRating.toFixed(1)} RMP
                          </span>
                        )}
                        {sec.avgGpa !== null && (
                          <span className="text-[11px] text-blue-600 font-semibold">
                            {sec.avgGpa.toFixed(2)} avg GPA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Seats */}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                      isOpen
                        ? 'bg-green-100 text-green-700'
                        : sec.waitCount > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {isOpen
                        ? `${sec.seatsAvailable}/${sec.maximumEnrollment} open`
                        : sec.waitCount > 0
                          ? `Waitlisted (${sec.waitCount})`
                          : 'Full'}
                    </span>

                    {/* Swap button */}
                    <button
                      onClick={() => handleSwap(sec)}
                      disabled={!!swapping}
                      className="bg-primary-container text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 shrink-0"
                    >
                      {isSwapping ? '…' : 'Swap'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
