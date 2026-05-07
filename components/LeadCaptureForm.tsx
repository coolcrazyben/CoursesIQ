'use client'

import { useState } from 'react'
import { getStoredUTM } from '@/lib/analytics'
import { trackGuideDownload } from '@/lib/analytics'

const MSU_MAJORS = [
  'Computer Science', 'Computer Engineering', 'Electrical Engineering',
  'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
  'Biology', 'Chemistry', 'Mathematics', 'Physics',
  'Business Administration', 'Accounting', 'Finance', 'Marketing',
  'Psychology', 'Communication', 'Political Science', 'History',
  'Kinesiology', 'Nursing', 'Architecture', 'Landscape Architecture',
  'Agriculture', 'Animal Science', 'Pre-Medicine', 'Other',
]

interface Props {
  isAuthenticated: boolean
  pageSlug?: string
}

export default function LeadCaptureForm({ isAuthenticated, pageSlug }: Props) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [major, setMajor] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  if (isAuthenticated) return null

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 my-8 text-center">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <p className="font-semibold text-gray-900 mb-1">Check your inbox!</p>
        <p className="text-sm text-gray-600">Your MSU Registration Rescue Pack is on its way.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    const utm = getStoredUTM()

    try {
      const res = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName || undefined,
          major: major || undefined,
          page_slug: pageSlug,
          utm_source: utm?.utm_source,
          utm_medium: utm?.utm_medium,
          utm_campaign: utm?.utm_campaign,
        }),
      })

      if (res.ok) {
        setStatus('success')
        trackGuideDownload({ email, source: pageSlug ?? 'unknown' })
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="bg-[#5D1725]/5 border border-[#5D1725]/20 rounded-2xl p-6 my-8">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Get your MSU Registration Rescue Pack</h3>
      <p className="text-sm text-gray-600 mb-5">
        3 proven strategies to get into full courses — delivered to your inbox, free.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1725]/30"
          />
          <select
            value={major}
            onChange={e => setMajor(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1725]/30 text-gray-700"
          >
            <option value="">Your major (optional)</option>
            {MSU_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            required
            placeholder="your@msstate.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1725]/30"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="shrink-0 bg-[#5D1725] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {status === 'loading' ? '…' : 'Get it free'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </div>
  )
}
