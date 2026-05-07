'use client'

import { useState } from 'react'
import { trackDidYouGetInResponse } from '@/lib/analytics'

interface Props {
  alertId: string
  courseName: string
}

type Outcome = 'yes' | 'no' | 'alternative'

const OPTIONS: { outcome: Outcome; label: string; emoji: string }[] = [
  { outcome: 'yes', label: 'Yes, I got in!', emoji: '🎉' },
  { outcome: 'no', label: 'No, still full', emoji: '😔' },
  { outcome: 'alternative', label: 'Found an alternative', emoji: '↗️' },
]

export default function DidYouGetInSurvey({ alertId, courseName }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  async function submit(outcome: Outcome) {
    setStatus('loading')
    try {
      await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, outcome }),
      })
      trackDidYouGetInResponse({ outcome, alert_id: alertId })
    } catch { /* non-fatal */ }
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <p className="text-xs text-green-600 font-medium mt-2">Thanks for the update!</p>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs text-gray-500 mb-2">Did you get into <strong>{courseName}</strong>?</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ outcome, label, emoji }) => (
          <button
            key={outcome}
            onClick={() => submit(outcome)}
            disabled={status === 'loading'}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {emoji} {label}
          </button>
        ))}
      </div>
    </div>
  )
}
