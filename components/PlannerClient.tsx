'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Schedule, ScheduleCourse } from '@/app/(app)/planner/page'
import type { MeetingTime } from '@/lib/banner'
import WeeklyCalendar from '@/components/WeeklyCalendar'
import CourseSummaryPanel from '@/components/CourseSummaryPanel'

interface Props {
  initialSchedules: Schedule[]
  initialCourses: ScheduleCourse[]
  userId: string
  plan: 'free' | 'pro'
}

interface Suggestion {
  subject: string
  course_number: string
  title: string | null
  label: string
}

interface SectionMeeting {
  days: string
  beginTime: string
  endTime: string
  building: string | null
  room: string | null
  raw: MeetingTime
}

interface SectionResult {
  crn: string
  section: string
  title: string
  instructor: string | null
  seatsAvailable: number
  maximumEnrollment: number
  meetingTimes: SectionMeeting[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(2), 10)
}

function formatTime(t: string): string {
  const h = parseInt(t.slice(0, 2), 10)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${t.slice(2)}${ampm}`
}

function meetingLabel(mt: SectionMeeting): string {
  if (!mt.days) return 'TBA'
  const t = mt.beginTime && mt.endTime ? ` ${formatTime(mt.beginTime)}–${formatTime(mt.endTime)}` : ''
  return `${mt.days}${t}`
}

function courseMeetingSummary(course: ScheduleCourse): string | null {
  if (!course.meeting_times?.length) return null
  const mt = course.meeting_times[0]
  const days = (['monday','tuesday','wednesday','thursday','friday'] as const)
    .map((d, i) => mt[d] && ['M','T','W','R','F'][i])
    .filter(Boolean).join('')
  if (!days) return null
  const time = mt.beginTime && mt.endTime ? ` ${formatTime(mt.beginTime)}–${formatTime(mt.endTime)}` : ''
  const loc  = mt.building ? ` · ${mt.building} ${mt.room ?? ''}`.trimEnd() : ''
  return `${days}${time}${loc}`
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
const DAY_KEYS: DayKey[]    = ['monday','tuesday','wednesday','thursday','friday']
const DAY_LABELS             = ['Monday','Tuesday','Wednesday','Thursday','Friday']

function coursesConflict(c1: ScheduleCourse, c2: ScheduleCourse): boolean {
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

function computeGaps(courses: ScheduleCourse[]): string[] {
  const warnings: string[] = []
  for (let i = 0; i < DAY_KEYS.length; i++) {
    const slots: { start: number; end: number }[] = []
    for (const c of courses) {
      for (const mt of c.meeting_times ?? []) {
        if (mt[DAY_KEYS[i]] && mt.beginTime && mt.endTime) {
          slots.push({ start: timeToMin(mt.beginTime), end: timeToMin(mt.endTime) })
        }
      }
    }
    if (slots.length >= 2) {
      slots.sort((a, b) => a.start - b.start)
      for (let j = 0; j < slots.length - 1; j++) {
        const gap = slots[j + 1].start - slots[j].end
        if (gap >= 120) warnings.push(`${Math.round(gap / 60)}-hr gap on ${DAY_LABELS[i]}s`)
      }
    }
  }
  return warnings
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PlannerClient({ initialSchedules, initialCourses, userId, plan }: Props) {
  const supabase = createClient()
  const [schedules, setSchedules]     = useState<Schedule[]>(initialSchedules)
  const [courses, setCourses]         = useState<ScheduleCourse[]>(initialCourses)
  const [selectedId, setSelectedId]   = useState<string | null>(initialSchedules[0]?.id ?? null)
  const [compareId, setCompareId]     = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [savedToast, setSavedToast]   = useState(false)

  // Paywall modal
  const [paywallOpen, setPaywallOpen] = useState(false)

  // Modal state
  const [addModalOpen, setAddModalOpen]       = useState(false)
  const [modalStep, setModalStep]             = useState<1 | 2>(1)
  const [searchQuery, setSearchQuery]         = useState('')
  const [suggestions, setSuggestions]         = useState<Suggestion[]>([])
  const [activeIndex, setActiveIndex]         = useState(-1)
  const [pendingCourse, setPendingCourse]     = useState<Suggestion | null>(null)
  const [sections, setSections]               = useState<SectionResult[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [insertError, setInsertError]         = useState<string | null>(null)
  const [addingCrn, setAddingCrn]             = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Course search suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(searchQuery)}`)
        setSuggestions(await res.json())
        setActiveIndex(-1)
      } catch { setSuggestions([]) }
    }, 300)
  }, [searchQuery])

  function closeModal() {
    setAddModalOpen(false); setModalStep(1); setSearchQuery('')
    setSuggestions([]); setPendingCourse(null); setSections([])
    setInsertError(null); setAddingCrn(null)
  }

  async function selectSuggestion(s: Suggestion) {
    setPendingCourse(s); setModalStep(2); setSectionsLoading(true); setSections([])
    try {
      const res = await fetch(`/api/sections?subject=${encodeURIComponent(s.subject)}&number=${encodeURIComponent(s.course_number)}`)
      setSections(await res.json())
    } catch { setSections([]) }
    finally { setSectionsLoading(false) }
  }

  async function createSchedule() {
    if (plan === 'free' && schedules.length >= 1) {
      setPaywallOpen(true)
      return
    }
    const { data, error } = await supabase
      .from('schedules')
      .insert({ user_id: userId, name: `Schedule ${schedules.length + 1}` })
      .select().single()
    if (!error && data) { setSchedules(prev => [...prev, data]); setSelectedId(data.id) }
  }

  async function deleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
    setCourses(prev => prev.filter(c => c.schedule_id !== id))
    if (selectedId === id) setSelectedId(schedules.find(s => s.id !== id)?.id ?? null)
    if (compareId === id) { setCompareId(null); setCompareMode(false) }
  }

  async function renameSchedule(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return }
    await supabase.from('schedules').update({ name: renameValue.trim() }).eq('id', id)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, name: renameValue.trim() } : s))
    setRenamingId(null)
  }

  async function addCourse(section: SectionResult, asPending = false) {
    if (!selectedId || !pendingCourse) return
    setInsertError(null); setAddingCrn(section.crn)
    const { data, error } = await supabase
      .from('schedule_courses')
      .insert({
        schedule_id: selectedId,
        subject: pendingCourse.subject,
        course_number: pendingCourse.course_number,
        professor: section.instructor,
        crn: section.crn,
        meeting_times: section.meetingTimes.map(mt => mt.raw),
        is_pending: asPending,
      })
      .select().single()
    setAddingCrn(null)
    if (error) { setInsertError(error.message); return }
    if (data) setCourses(prev => [...prev, data])
    closeModal()
  }

  async function promoteCourse(id: string) {
    await supabase.from('schedule_courses').update({ is_pending: false }).eq('id', id)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, is_pending: false } : c))
  }

  async function removeCourse(id: string) {
    await supabase.from('schedule_courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  function coursesFor(scheduleId: string) {
    return courses.filter(c => c.schedule_id === scheduleId)
  }

  function showSavedToast() {
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  const selected = schedules.find(s => s.id === selectedId) ?? null
  const compare  = schedules.find(s => s.id === compareId)  ?? null

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── Left: schedule list ── */}
      <aside className="w-60 border-r border-outline-variant bg-white flex flex-col shrink-0 py-5 px-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-primary-container">My Schedules</h4>
          <button
            onClick={createSchedule}
            className="w-7 h-7 bg-primary-container text-white rounded-lg flex items-center justify-center hover:opacity-90"
            title="New schedule"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {schedules.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No schedules yet.<br />Click + to create one.</p>
          )}
          {schedules.map(s => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                selectedId === s.id ? 'bg-primary-container/10 text-primary-container' : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => setSelectedId(s.id)}
            >
              {renamingId === s.id ? (
                <input
                  autoFocus value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => renameSchedule(s.id)}
                  onKeyDown={e => { if (e.key === 'Enter') renameSchedule(s.id); if (e.key === 'Escape') setRenamingId(null) }}
                  className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-0.5 focus:outline-none"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-xs font-medium truncate">{s.name}</span>
              )}
              <div className="hidden group-hover:flex items-center gap-1">
                <button className="p-0.5 hover:text-primary-container" onClick={e => { e.stopPropagation(); setRenamingId(s.id); setRenameValue(s.name) }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                </button>
                <button className="p-0.5 hover:text-red-500" onClick={e => { e.stopPropagation(); deleteSchedule(s.id) }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                </button>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">{coursesFor(s.id).length}</span>
            </div>
          ))}
        </div>

        {/* Compare toggle */}
        {schedules.length >= 2 && (
          <div className="pt-3 border-t border-outline-variant mt-3">
            <button
              onClick={() => {
                if (compareMode) { setCompareMode(false); setCompareId(null) }
                else { setCompareId(schedules.find(s => s.id !== selectedId)?.id ?? null); setCompareMode(true) }
              }}
              className={`w-full text-xs py-2 rounded-lg font-medium transition-colors ${
                compareMode ? 'bg-primary-container text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {compareMode ? 'Exit Compare' : 'Compare Schedules'}
            </button>
            {compareMode && (
              <select
                className="mt-2 w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
                value={compareId ?? ''} onChange={e => setCompareId(e.target.value)}
              >
                {schedules.filter(s => s.id !== selectedId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary-container mb-4">
            <span className="material-symbols-outlined text-3xl">calendar_today</span>
          </div>
          <h3 className="text-h2 text-on-surface mb-2">No schedule selected</h3>
          <p className="text-body-md text-secondary">Create a schedule on the left to get started.</p>
        </div>
      ) : compareMode && compare ? (
        /* Compare mode — two full-width panels */
        <div className="flex-1 overflow-y-auto bg-surface-container-low p-6 grid grid-cols-2 gap-6">
          <ComparePanel schedule={selected} courses={coursesFor(selected.id)} onAdd={() => { setModalStep(1); setAddModalOpen(true) }} onRemove={removeCourse} />
          <ComparePanel schedule={compare}   courses={coursesFor(compare.id)}  onAdd={() => { setSelectedId(compare.id); setModalStep(1); setAddModalOpen(true) }} onRemove={removeCourse} />
        </div>
      ) : (
        /* Normal mode — calendar + right panel */
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar column */}
          <div className="flex-1 overflow-y-auto bg-surface-container-low p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-h2 text-on-surface font-bold">{selected.name}</h2>
                <p className="text-xs text-secondary mt-0.5">
                  {coursesFor(selected.id).filter(c => !c.is_pending).length} active ·{' '}
                  {coursesFor(selected.id).filter(c => c.is_pending).length} pending
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savedToast && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                    Saved
                  </span>
                )}
                <button
                  onClick={showSavedToast}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-700 px-3 py-2 rounded-xl hover:border-primary-container/40 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                  Save Draft
                </button>
                <button
                  onClick={() => { setModalStep(1); setAddModalOpen(true) }}
                  className="flex items-center gap-1.5 text-sm bg-primary-container text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity font-bold"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Add Course
                </button>
              </div>
            </div>

            {/* Calendar */}
            <WeeklyCalendar
              courses={coursesFor(selected.id).filter(c => !c.is_pending)}
              pendingCourses={coursesFor(selected.id).filter(c => c.is_pending)}
            />

            {/* Active course chips below calendar */}
            {coursesFor(selected.id).filter(c => !c.is_pending).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {coursesFor(selected.id).filter(c => !c.is_pending).map((c, idx) => {
                  const PALETTE = ['#601020','#1d4ed8','#15803d','#b45309','#7c3aed','#be185d']
                  const color = PALETTE[idx % PALETTE.length]
                  return (
                    <div key={c.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <Link
                        href={`/course?subject=${encodeURIComponent(c.subject)}&number=${encodeURIComponent(c.course_number)}`}
                        className="text-xs font-semibold text-on-surface hover:text-primary-container hover:underline transition-colors"
                      >
                        {c.subject} {c.course_number}
                      </Link>
                      {c.professor && <span className="text-xs text-secondary hidden sm:inline">{c.professor}</span>}
                      {c.professor && <CourseSummaryPanel subject={c.subject} course_number={c.course_number} professor={c.professor} />}
                      <button onClick={() => removeCourse(c.id)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right panel: Pending + Health ── */}
          <RightPanel
            courses={coursesFor(selected.id)}
            onPromote={promoteCourse}
            onRemove={removeCourse}
            onAdd={() => { setModalStep(1); setAddModalOpen(true) }}
          />
        </div>
      )}

      {/* ── Paywall Modal ── */}
      {paywallOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 text-center">
            <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            </div>
            <h3 className="text-h3 text-on-surface mb-2">Upgrade to Pro</h3>
            <p className="text-sm text-secondary mb-5">
              Free accounts are limited to <strong>1 schedule</strong>. Upgrade to Pro for unlimited schedules and alerts.
            </p>
            <ul className="text-left space-y-2 mb-6">
              {['Unlimited schedules', 'Unlimited seat alerts', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-green-500" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/upgrade"
              className="block w-full bg-primary-container text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity mb-2"
            >
              See plans — from $5/mo
            </Link>
            <button
              onClick={() => setPaywallOpen(false)}
              className="block w-full text-sm text-secondary hover:text-on-surface transition-colors py-1"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* ── Add Course Modal ── */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {modalStep === 2 && (
                  <button onClick={() => { setModalStep(1); setSections([]) }} className="text-gray-400 hover:text-gray-600">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                  </button>
                )}
                <h3 className="font-semibold text-gray-900">
                  {modalStep === 1 ? 'Add a Course' : `${pendingCourse?.subject} ${pendingCourse?.course_number} — Pick a Section`}
                </h3>
              </div>
              <button onClick={closeModal}><span className="material-symbols-outlined text-gray-400">close</span></button>
            </div>

            {/* Step 1: Search */}
            {modalStep === 1 && (
              <>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">search</span>
                  <input
                    autoFocus type="text" placeholder="Search courses (e.g. CSE 1011)"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i+1, suggestions.length-1)) }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i-1, 0)) }
                      else if (e.key === 'Enter' && suggestions[activeIndex]) selectSuggestion(suggestions[activeIndex])
                      else if (e.key === 'Escape') closeModal()
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-container/30"
                  />
                  {suggestions.length > 0 && (
                    <ul className="mt-2 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                      {suggestions.map((s, i) => (
                        <li
                          key={s.label}
                          className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 ${i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                          onClick={() => selectSuggestion(s)} onMouseEnter={() => setActiveIndex(i)}
                        >
                          <span className="material-symbols-outlined text-gray-400 shrink-0" style={{ fontSize: 16 }}>school</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{s.subject} {s.course_number}</p>
                            {s.title && <p className="text-xs text-gray-400 truncate">{s.title}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">Type a subject code or course number to search.</p>
              </>
            )}

            {/* Step 2: Section picker */}
            {modalStep === 2 && (
              <div className="mt-1">
                {sectionsLoading ? (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 20 }}>progress_activity</span>
                    Loading sections…
                  </div>
                ) : sections.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No sections found for this term.</p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {insertError && (
                      <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-2">Error: {insertError}</p>
                    )}
                    {sections.map(sec => {
                      const timeSummary = sec.meetingTimes.map(meetingLabel).join(', ') || 'TBA'
                      const seatsColor  = sec.seatsAvailable === 0 ? 'bg-red-100 text-red-600' : sec.seatsAvailable <= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      const isAdding    = addingCrn === sec.crn
                      return (
                        <div key={sec.crn} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-primary-container/30 hover:bg-gray-50 transition-colors">
                          <span className="text-[11px] font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">{sec.crn}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">§{sec.section}{sec.instructor ? ` — ${sec.instructor}` : ''}</p>
                            <p className="text-xs text-gray-400 truncate">{timeSummary}</p>
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${seatsColor}`}>
                            {sec.seatsAvailable}/{sec.maximumEnrollment}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => addCourse(sec, true)} disabled={!!addingCrn}
                              className="border border-primary-container text-primary-container text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary-fixed/30 transition-colors disabled:opacity-50"
                              title="Save to pending"
                            >
                              Pending
                            </button>
                            <button
                              onClick={() => addCourse(sec, false)} disabled={!!addingCrn}
                              className="bg-primary-container text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {isAdding ? '…' : 'Add'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Right panel ─────────────────────────────────────────────────────────────

function RightPanel({
  courses, onPromote, onRemove, onAdd,
}: {
  courses: ScheduleCourse[]
  onPromote: (id: string) => void
  onRemove:  (id: string) => void
  onAdd:     () => void
}) {
  const active  = courses.filter(c => !c.is_pending)
  const pending = courses.filter(c =>  c.is_pending)

  // Conflict detection
  const conflictIds = new Set<string>()
  for (const p of pending) {
    for (const a of active) {
      if (coursesConflict(p, a)) { conflictIds.add(p.id); break }
    }
  }

  // Schedule health
  const gaps = computeGaps(active)
  const maxCourses = 5
  const healthPct  = Math.min(100, Math.round((active.length / maxCourses) * 100))

  return (
    <div className="w-80 border-l border-outline-variant bg-white shrink-0 overflow-y-auto flex flex-col">
      {/* Pending courses */}
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-on-surface">Pending Courses</h3>
          <span className="w-5 h-5 bg-primary-container text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-gray-300 text-3xl block mb-1">bookmark_border</span>
            <p className="text-xs text-secondary">No pending courses.<br />Click &quot;Pending&quot; when adding a section.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(c => {
              const hasConflict = conflictIds.has(c.id)
              const summary = courseMeetingSummary(c)
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3 ${hasConflict ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/course?subject=${encodeURIComponent(c.subject)}&number=${encodeURIComponent(c.course_number)}`}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded hover:underline ${hasConflict ? 'bg-red-100 text-red-700' : 'bg-primary-fixed text-primary-container'}`}
                        >
                          {c.subject} {c.course_number}
                        </Link>
                        {hasConflict && (
                          <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>warning</span>
                            CONFLICT
                          </span>
                        )}
                      </div>
                      {c.professor && <p className="text-xs text-secondary mt-1 truncate">{c.professor}</p>}
                      {summary    && <p className="text-xs text-gray-400 truncate">{summary}</p>}
                    </div>
                    <button onClick={() => onRemove(c.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </div>

                  {hasConflict ? (
                    <Link
                      href={`/course?subject=${encodeURIComponent(c.subject)}&number=${encodeURIComponent(c.course_number)}`}
                      className="block w-full text-center text-xs font-semibold py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Find Alternatives
                    </Link>
                  ) : (
                    <button
                      onClick={() => onPromote(c.id)}
                      className="block w-full text-center text-xs font-bold py-1.5 rounded-lg bg-primary-container text-white hover:opacity-90 transition-opacity"
                    >
                      Add to Schedule
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={onAdd}
          className="mt-3 w-full text-xs text-secondary border border-dashed border-gray-200 rounded-xl py-2 hover:border-primary-container/40 hover:text-primary-container transition-colors"
        >
          + Browse courses
        </button>
      </div>

      {/* Schedule Health */}
      <div className="p-4 bg-primary-container text-white flex-1">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>insights</span>
          <h3 className="text-sm font-bold">Schedule Health</h3>
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs text-white/70">Active Courses</span>
            <span className="font-black text-lg">{active.length} / {maxCourses}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>

        {gaps.length === 0 && active.length > 0 && (
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/90">
            <span className="material-symbols-outlined text-green-300" style={{ fontSize: 14 }}>check_circle</span>
            No large gaps detected
          </div>
        )}

        {gaps.map((g, i) => (
          <div key={i} className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/90 mb-1.5">
            <span className="material-symbols-outlined text-yellow-300 shrink-0" style={{ fontSize: 14 }}>lightbulb</span>
            <span>You have a <span className="font-bold text-yellow-200">{g}</span>. Consider adding a lab or study session.</span>
          </div>
        ))}

        {active.length === 0 && (
          <p className="text-xs text-white/50 text-center py-2">Add courses to see schedule health.</p>
        )}
      </div>
    </div>
  )
}

// ─── Compare mode panel ───────────────────────────────────────────────────────

function ComparePanel({
  schedule, courses, onAdd, onRemove,
}: {
  schedule: Schedule
  courses: ScheduleCourse[]
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-h2 text-on-surface">{schedule.name}</h2>
          <p className="text-sm text-secondary">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onAdd} className="bg-primary-container text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Add
        </button>
      </div>
      <WeeklyCalendar courses={courses.filter(c => !c.is_pending)} />
      <div className="mt-3 space-y-1.5">
        {courses.filter(c => !c.is_pending).map(c => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
            <Link
              href={`/course?subject=${encodeURIComponent(c.subject)}&number=${encodeURIComponent(c.course_number)}`}
              className="text-xs font-semibold text-on-surface hover:text-primary-container hover:underline transition-colors"
            >
              {c.subject} {c.course_number}
            </Link>
            <button onClick={() => onRemove(c.id)} className="text-gray-300 hover:text-red-400">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
