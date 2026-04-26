'use client'

import { useState } from 'react'

type Alert = {
  id: string
  crn: string
  subject: string
  course_number: string
  course_name: string | null
  created_at: string
}

interface Props {
  alerts: Alert[]
}

export default function DashboardAlerts({ alerts: initial }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initial)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  async function handleCancel(id: string) {
    if (confirmingId !== id) {
      // First click: arm the confirmation
      setConfirmingId(id)
      setCancelError(null)
      return
    }

    // Second click: optimistic removal then fire PATCH
    setConfirmingId(null)
    setAlerts((prev) => prev.filter((a) => a.id !== id))

    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
      if (!res.ok) {
        // Rollback: restore original alerts list
        setAlerts(initial)
        setCancelError('Failed to cancel alert. Please try again.')
      }
    } catch {
      // Network error: rollback
      setAlerts(initial)
      setCancelError('Network error. Please check your connection.')
    }
  }

  function handleCancelClick(id: string) {
    // If user clicks a different alert's cancel button while one is armed, reset to new id
    if (confirmingId !== null && confirmingId !== id) {
      setConfirmingId(null)
    }
    handleCancel(id)
  }

  if (alerts.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No active alerts found for this number.
      </p>
    )
  }

  return (
    <div>
      {cancelError && (
        <p role="alert" className="text-red-600 text-sm mb-4">
          {cancelError}
        </p>
      )}
      <ul className="space-y-3">
        {alerts.map((alert) => {
          const courseName = alert.course_name ?? `${alert.subject} ${alert.course_number}`
          const isConfirming = confirmingId === alert.id
          return (
            <li
              key={alert.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-lg p-4"
            >
              <div>
                <p className="font-semibold text-gray-900">{courseName}</p>
                <p className="text-sm text-gray-500">CRN: {alert.crn}</p>
              </div>
              <button
                onClick={() => handleCancelClick(alert.id)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  isConfirming
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-maroon hover:opacity-90'
                }`}
              >
                {isConfirming ? 'Confirm cancel?' : 'Cancel alert'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
