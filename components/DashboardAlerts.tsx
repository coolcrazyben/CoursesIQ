'use client'

import { useState } from 'react'
import type { Alert } from '@/app/(app)/dashboard/page'

function calcProbability(pos: number | null, total: number | null): { label: 'LIKELY' | 'STABLE' | 'UNLIKELY'; pct: number } {
  if (!pos) return { label: 'STABLE', pct: 50 }
  const ratio = total ? pos / total : null
  if (ratio !== null) {
    if (ratio <= 0.2)  return { label: 'LIKELY',   pct: Math.max(75, Math.round(95 - ratio * 50)) }
    if (ratio <= 0.55) return { label: 'STABLE',   pct: Math.round(65 - ratio * 40) }
    return               { label: 'UNLIKELY', pct: Math.max(5, Math.round(30 - (ratio - 0.55) * 60)) }
  }
  if (pos <= 3) return { label: 'LIKELY',   pct: 90 }
  if (pos <= 8) return { label: 'STABLE',   pct: 55 }
  return              { label: 'UNLIKELY', pct: 18 }
}

const PROB_STYLES = {
  LIKELY:   { bar: 'bg-green-500',  text: 'text-green-600',  bg: 'bg-green-50',  icon: 'trending_up'   },
  STABLE:   { bar: 'bg-blue-400',   text: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'trending_flat' },
  UNLIKELY: { bar: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-50',    icon: 'trending_down' },
}

interface PositionEditorProps {
  alert: Alert
  onSave: (id: string, pos: number | null, total: number | null) => void
}

function PositionEditor({ alert, onSave }: PositionEditorProps) {
  const [editing, setEditing] = useState(false)
  const [pos,   setPos]   = useState(String(alert.waitlist_position ?? ''))
  const [total, setTotal] = useState(String(alert.waitlist_total    ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const p = pos.trim()   ? parseInt(pos.trim(),   10) : null
    const t = total.trim() ? parseInt(total.trim(), 10) : null
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: alert.id, waitlist_position: p, waitlist_total: t }),
    })
    onSave(alert.id, p, t)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[11px] text-secondary hover:text-primary-container underline-offset-2 hover:underline transition-colors"
      >
        {alert.waitlist_position ? `#${alert.waitlist_position}${alert.waitlist_total ? ` of ${alert.waitlist_total}` : ''}` : 'Add position'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <input
        type="number" min={1} placeholder="#"
        value={pos} onChange={e => setPos(e.target.value)}
        className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-container/40"
      />
      <span className="text-xs text-secondary">of</span>
      <input
        type="number" min={1} placeholder="total"
        value={total} onChange={e => setTotal(e.target.value)}
        className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-container/40"
      />
      <button
        onClick={save} disabled={saving}
        className="text-xs bg-primary-container text-white px-2 py-1 rounded font-medium disabled:opacity-50"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-secondary">✕</button>
    </div>
  )
}

interface Props { alerts: Alert[] }

export default function DashboardAlerts({ alerts: initial }: Props) {
  const [alerts, setAlerts]       = useState<Alert[]>(initial)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancelError,  setCancelError]  = useState<string | null>(null)

  function updatePosition(id: string, pos: number | null, total: number | null) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, waitlist_position: pos, waitlist_total: total } : a))
  }

  async function handleCancel(id: string) {
    if (confirmingId !== id) { setConfirmingId(id); setCancelError(null); return }
    setConfirmingId(null)
    setAlerts(prev => prev.filter(a => a.id !== id))
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
      if (!res.ok) { setAlerts(initial); setCancelError('Failed to stop tracking. Please try again.') }
    } catch {
      setAlerts(initial); setCancelError('Network error. Please try again.')
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="py-16 text-center">
        <span className="material-symbols-outlined text-gray-300 text-5xl mb-3 block">hourglass_empty</span>
        <p className="font-medium text-gray-700 mb-1">No tracked courses</p>
        <p className="text-sm text-secondary">Set up an alert to start tracking a waitlisted course.</p>
      </div>
    )
  }

  return (
    <div>
      {cancelError && (
        <p role="alert" className="text-red-600 text-sm px-6 py-3 bg-red-50 border-b border-red-100">{cancelError}</p>
      )}

      <div className="divide-y divide-gray-100">
        {alerts.map(alert => {
          const { label, pct } = calcProbability(alert.waitlist_position, alert.waitlist_total)
          const s = PROB_STYLES[label]
          const isConfirming = confirmingId === alert.id
          const barWidth = alert.waitlist_position && alert.waitlist_total
            ? Math.round((alert.waitlist_position / alert.waitlist_total) * 100)
            : 50

          return (
            <div key={alert.id} className="flex items-center gap-4 px-6 py-5">
              {/* Subject badge */}
              <div className="w-14 h-14 bg-primary-container rounded-xl flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] text-white/70 font-semibold uppercase tracking-wide leading-tight">{alert.subject}</span>
                <span className="text-lg font-black text-white leading-tight">{alert.course_number}</span>
              </div>

              {/* Course info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-on-surface text-sm">
                    {alert.course_name ?? `${alert.subject} ${alert.course_number}`}
                  </p>
                  {alert.crn && (
                    <span className="text-[10px] bg-gray-100 text-secondary px-2 py-0.5 rounded font-mono">CRN {alert.crn}</span>
                  )}
                </div>
                <PositionEditor alert={alert} onSave={updatePosition} />
              </div>

              {/* Waitlist position bar */}
              <div className="w-40 shrink-0 hidden md:block">
                <p className="text-[10px] text-secondary uppercase tracking-wider mb-1.5 font-semibold">Waitlist Pos.</p>
                <p className="text-sm font-bold text-on-surface mb-1">
                  {alert.waitlist_position
                    ? <><span className="text-primary-container">#{alert.waitlist_position}</span>{alert.waitlist_total ? ` of ${alert.waitlist_total}` : ''}</>
                    : <span className="text-secondary text-xs">—</span>}
                </p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${s.bar}`}
                    style={{ width: `${Math.min(100, Math.max(4, 100 - barWidth))}%` }}
                  />
                </div>
              </div>

              {/* Probability */}
              <div className={`w-28 shrink-0 rounded-xl px-3 py-2 text-center ${s.bg}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{label}</p>
                <div className={`flex items-center justify-center gap-0.5 ${s.text}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{s.icon}</span>
                  <span className="text-lg font-black">{pct}%</span>
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => handleCancel(alert.id)}
                title={isConfirming ? 'Click again to confirm' : 'Stop tracking'}
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isConfirming ? 'bg-red-500 text-white' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-[10px] text-secondary uppercase tracking-widest py-4 border-t border-gray-100">
        End of tracked courses
      </p>
    </div>
  )
}
