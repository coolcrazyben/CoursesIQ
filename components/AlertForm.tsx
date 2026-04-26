'use client'

import { useState } from 'react'
import { parsePhoneNumber } from 'libphonenumber-js'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

export default function AlertForm() {
  const [crn, setCrn] = useState('')
  const [subject, setSubject] = useState('')
  const [courseNumber, setCourseNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [phoneError, setPhoneError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')
    setPhoneError('')

    // Client-side phone validation (UI-04: no API call on invalid phone)
    let e164: string
    try {
      const parsed = parsePhoneNumber(phone, 'US')
      if (!parsed || !parsed.isValid()) {
        setPhoneError('Please enter a valid US phone number (e.g., 601-555-1234).')
        return
      }
      e164 = parsed.number
    } catch {
      setPhoneError('Please enter a valid US phone number (e.g., 601-555-1234).')
      return
    }

    setStatus('submitting')

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crn,
          subject,
          course_number: courseNumber,
          phone_number: e164,
          email: email.trim() || undefined,
        }),
      })

      if (res.status === 201) {
        setStatus('success')
        return
      }

      const body = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setErrorMessage('You already have an active alert for this CRN and phone number.')
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg">You&apos;re signed up!</p>
        <p className="text-green-700 mt-1">
          We&apos;ll text you the moment a seat opens in that course.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="crn" className="block text-sm font-medium text-gray-700 mb-1">
          CRN (Course Reference Number)
        </label>
        <input
          id="crn"
          type="text"
          value={crn}
          onChange={(e) => setCrn(e.target.value)}
          placeholder="e.g. 12345"
          required
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject (e.g., CSE)
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value.toUpperCase())}
          placeholder="e.g. CSE"
          required
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
        />
      </div>

      <div>
        <label htmlFor="courseNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Course Number (e.g., 1011)
        </label>
        <input
          id="courseNumber"
          type="text"
          value={courseNumber}
          onChange={(e) => setCourseNumber(e.target.value)}
          placeholder="e.g. 1011"
          required
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setPhoneError('') }}
          placeholder="(601) 555-1234"
          required
          className={`w-full px-3 py-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon ${
            phoneError ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {/* TCPA consent text — LOCKED per UI-10 and CONTEXT.md */}
        <p className="text-xs text-gray-500 mt-1">
          By submitting, you consent to receive SMS alerts. Message &amp; data rates may apply.
          Reply STOP to unsubscribe.
        </p>
        {phoneError && (
          <p role="alert" className="text-red-600 text-sm mt-1">
            {phoneError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="text-red-600 text-sm">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-maroon text-white py-3 px-4 rounded-lg text-base font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {status === 'submitting' ? 'Setting up alert...' : 'Alert Me'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Find your CRN in the{' '}
        <a
          href="https://mybanner.msstate.edu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-maroon underline"
        >
          MSU class schedule
        </a>
        . Subject and Course Number appear next to each course listing
        (e.g., CSE 1011).
      </p>
    </form>
  )
}
