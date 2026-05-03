'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface Suggestion {
  subject: string
  course_number: string
  label: string
}

interface SectionOption {
  crn: string
  section: string
  instructor: string | null
  days: string
  beginTime: string
  endTime: string
  seatsAvailable: number
  maximumEnrollment: number
}

interface AlertFormProps {
  initialSubject?: string
  initialCourse?: string
  prefillEmail?: string
  onSuccess?: () => void
}

function formatTime(t: string): string {
  if (!t || t.length !== 4) return t
  const h = parseInt(t.slice(0, 2), 10)
  const m = t.slice(2)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h > 12 ? h - 12 : h || 12}:${m} ${ampm}`
}

export default function AlertForm({ initialSubject, initialCourse, prefillEmail, onSuccess }: AlertFormProps = {}) {
  const hasPreset = Boolean(initialSubject && initialCourse)
  const presetLabel = hasPreset ? `${initialSubject} ${initialCourse}` : ''

  const [query, setQuery] = useState(presetLabel)
  const [selected, setSelected] = useState<Suggestion | null>(
    hasPreset
      ? { subject: initialSubject!, course_number: initialCourse!, label: presetLabel }
      : null
  )
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Section picker state
  const [sections, setSections] = useState<SectionOption[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [selectedSection, setSelectedSection] = useState<SectionOption | null>(null) // null = any section

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || selected) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`)
        const data: Suggestion[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 300)
  }, [query, selected])

  // Fetch sections when a course is selected
  useEffect(() => {
    if (!selected) { setSections([]); setSelectedSection(null); return }
    setSectionsLoading(true)
    setSections([])
    setSelectedSection(null)
    fetch(`/api/sections?subject=${encodeURIComponent(selected.subject)}&number=${encodeURIComponent(selected.course_number)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ crn: string; section: string; instructor: string | null; meetingTimes: Array<{ days: string; beginTime: string; endTime: string }>; seatsAvailable: number; maximumEnrollment: number }>) => {
        setSections(data.map(s => ({
          crn: s.crn,
          section: s.section,
          instructor: s.instructor,
          days: s.meetingTimes?.[0]?.days ?? '',
          beginTime: s.meetingTimes?.[0]?.beginTime ?? '',
          endTime: s.meetingTimes?.[0]?.endTime ?? '',
          seatsAvailable: s.seatsAvailable,
          maximumEnrollment: s.maximumEnrollment,
        })))
        setSectionsLoading(false)
      })
      .catch(() => { setSections([]); setSectionsLoading(false) })
  }, [selected])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectCourse(s: Suggestion) {
    setSelected(s)
    setQuery(s.label)
    setOpen(false)
    setSuggestions([])
  }

  function clearCourse() {
    setSelected(null)
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setSections([])
    setSelectedSection(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && suggestions[activeIndex]) selectCourse(suggestions[activeIndex]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) { setErrorMessage('Please select a course from the list first.'); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    setErrorMessage('')
    setStatus('submitting')

    try {
      const body: Record<string, string> = {
        subject: selected.subject,
        course_number: selected.course_number,
        email: email.trim(),
      }
      if (selectedSection) {
        body.crn = selectedSection.crn
        body.section_number = selectedSection.section
        body.course_name = selected.label
      }

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 201) {
        setStatus('success')
        onSuccess?.()
        return
      }

      const resBody = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setErrorMessage('You already have an active alert for this course.')
      } else if (res.status === 402) {
        setErrorMessage('Free plan limit reached. Upgrade to Pro for unlimited alerts.')
      } else {
        setErrorMessage(resBody.error ?? 'Something went wrong. Please try again.')
      }
      setStatus('error')
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    const sectionLabel = selectedSection ? ` §${selectedSection.section}` : ''
    return (
      <div className="py-6 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-900 font-semibold text-lg">You&apos;re all set!</p>
        <p className="text-gray-600 mt-1 text-sm">
          We&apos;ll email you the moment a seat opens in{' '}
          <strong>{selected?.label ?? 'that course'}{sectionLabel}</strong>.
        </p>
        <a href="/course" className="inline-block mt-5 text-sm text-maroon font-medium hover:underline">
          View grade history and professor ratings →
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Course search with autocomplete */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
        <div ref={wrapperRef} className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ fontSize: 18 }}>search</span>
          <input
            type="text"
            value={query}
            onChange={e => { setSelected(null); setQuery(e.target.value) }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="e.g. CSE 1284 or Intro to Computer Science"
            required
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
            autoComplete="off"
          />
          {selected && (
            <button
              type="button"
              onClick={clearCourse}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear course"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
          {open && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <li
                  key={s.label}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 ${
                    i === activeIndex ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseDown={() => selectCourse(s)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 16 }}>school</span>
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {selected && (
          <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {selected.subject} {selected.course_number} selected
          </p>
        )}
      </div>

      {/* Section picker — shown after a course is selected */}
      {selected && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
          {sectionsLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
              <svg className="animate-spin w-4 h-4 text-maroon" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading sections...
            </div>
          ) : sections.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No section data available — will alert for any open seat.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {/* Any section option */}
              <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                selectedSection === null ? 'border-maroon bg-maroon/5' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="section"
                  checked={selectedSection === null}
                  onChange={() => setSelectedSection(null)}
                  className="accent-maroon"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Any open section</p>
                  <p className="text-xs text-gray-500">Alert me when any section has a seat</p>
                </div>
              </label>

              {/* Specific sections */}
              {sections.map(sec => {
                const isOpen = sec.seatsAvailable > 0
                return (
                  <label key={sec.crn} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedSection?.crn === sec.crn ? 'border-maroon bg-maroon/5' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="section"
                      checked={selectedSection?.crn === sec.crn}
                      onChange={() => setSelectedSection(sec)}
                      className="accent-maroon"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">§{sec.section}</span>
                        <span className="text-[10px] font-mono text-gray-400">CRN {sec.crn}</span>
                        {sec.instructor && (
                          <span className="text-xs text-gray-600 truncate">{sec.instructor}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sec.days && (
                          <span className="text-xs text-gray-500">
                            {sec.days} {sec.beginTime ? `${formatTime(sec.beginTime)}–${formatTime(sec.endTime)}` : ''}
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {sec.seatsAvailable}/{sec.maximumEnrollment} {isOpen ? 'open' : 'full'}
                        </span>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Email — hidden when pre-filled from session */}
      {prefillEmail ? (
        <input type="hidden" value={email} readOnly />
      ) : (
        <div>
          <label htmlFor="alert-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="alert-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@msstate.edu"
            required
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
          />
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="text-red-600 text-sm">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !selected}
        className="w-full bg-maroon text-white py-3 px-4 rounded-xl text-base font-semibold hover:bg-maroon-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'submitting' ? 'Setting up alert...' : 'Alert Me When a Seat Opens'}
      </button>
    </form>
  )
}
