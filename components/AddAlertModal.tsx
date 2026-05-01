'use client'

import { useState } from 'react'
import AlertForm from './AlertForm'

interface Props {
  userEmail: string
  isPro: boolean
  alertCount: number
}

export default function AddAlertModal({ userEmail, isPro, alertCount }: Props) {
  const [open, setOpen] = useState(false)
  const atLimit = !isPro && alertCount >= 1

  if (atLimit) {
    return (
      <a
        href="/upgrade"
        className="bg-primary-container text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>workspace_premium</span>
        Upgrade to Track More
      </a>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-primary-container text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
        Track New Course
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-on-surface leading-tight">Track a new course</h2>
                  <p className="text-xs text-secondary">Alert sent to {userEmail}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <AlertForm
              prefillEmail={userEmail}
              onSuccess={() => {
                setOpen(false)
                window.location.reload()
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
