'use client'

import { useEffect, useRef, useState } from 'react'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface Suggestion {
  subject: string
  course_number: string
  label: string
}

interface AlertFormProps {
  initialSubject?: string
  initialCourse?: string
  prefillEmail?: string
  onSuccess?: () => void
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
    setErrorMessage('')
    setStatus('submitting')

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selected.subject,
          course_number: selected.course_number,
          email: email.trim(),
        }),
      })

      if (res.status === 201) {
        setStatus('success')
        onSuccess?.()
        return
      }

      const body = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setErrorMessage('You already have an active alert for this course.')
      } else if (res.status === 402) {
        setErrorMessage('Free plan limit reached. Upgrade to Pro for unlimited alerts.')
      } else {
        setErrorMessage(body.error ?? 'Something went wrong. Please try again.')
      }
      setStatus('error')
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
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
          <strong>{selected?.label ?? 'that course'}</strong>.
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
