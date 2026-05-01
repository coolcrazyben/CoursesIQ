'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/lib/subscription'

const FREE_FEATURES = [
  '1 seat alert',
  '1 saved schedule',
  'Grade distributions',
  'Professor ratings',
  'Course search',
]

const PRO_FEATURES = [
  'Unlimited seat alerts',
  'Unlimited schedules',
  'Grade distributions',
  'Professor ratings',
  'Course search',
  'Priority support',
]

export default function UpgradeClient({ plan, loggedIn }: { plan: Plan; loggedIn: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'month' | 'year' | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(interval: 'month' | 'year') {
    if (!loggedIn) { router.push('/auth/login'); return }
    setLoading(interval)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not open billing portal.')
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(null)
    }
  }

  return (
    <>
    {error && (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        {error}
      </div>
    )}
    <div className="grid md:grid-cols-2 gap-6">
      {/* Free */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <p className="text-label-sm text-secondary uppercase tracking-widest mb-3">Free</p>
        <p className="font-black text-on-surface mb-1" style={{ fontSize: 42 }}>$0</p>
        <p className="text-sm text-secondary mb-8">Forever free</p>

        <ul className="space-y-3 mb-8">
          {FREE_FEATURES.map(f => (
            <li key={f} className="flex items-center gap-3 text-sm text-on-surface">
              <span className="material-symbols-outlined text-green-500" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
        >
          {plan === 'free' ? 'Current plan' : 'Free plan'}
        </button>
      </div>

      {/* Pro */}
      <div className="bg-primary-container rounded-2xl p-8 text-white relative overflow-hidden">
        {plan !== 'pro' && (
          <div className="absolute top-4 right-4 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Most Popular
          </div>
        )}

        <p className="text-label-sm text-white/60 uppercase tracking-widest mb-3">Pro</p>

        <div className="mb-8">
          <div className="flex items-baseline gap-2 mb-1">
            <p className="font-black" style={{ fontSize: 42 }}>$5</p>
            <p className="text-white/70 text-sm">/ month</p>
          </div>
          <p className="text-white/70 text-sm">or <strong className="text-white">$30 / year</strong> — save $30</p>
        </div>

        <ul className="space-y-3 mb-8">
          {PRO_FEATURES.map(f => (
            <li key={f} className="flex items-center gap-3 text-sm text-white">
              <span className="material-symbols-outlined text-green-300" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {f}
            </li>
          ))}
        </ul>

        {plan === 'pro' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center mb-3">
              <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span className="text-sm font-semibold">You&apos;re on Pro</span>
            </div>
            <button
              onClick={openPortal}
              disabled={loading === 'portal'}
              className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/20 transition-colors disabled:opacity-60 text-sm"
            >
              {loading === 'portal' ? 'Opening…' : 'Manage subscription'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => startCheckout('month')}
              disabled={!!loading}
              className="w-full bg-white text-primary-container py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
            >
              {loading === 'month' ? 'Redirecting…' : 'Start for $5 / month'}
            </button>
            <button
              onClick={() => startCheckout('year')}
              disabled={!!loading}
              className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/20 transition-colors disabled:opacity-60 text-sm"
            >
              {loading === 'year' ? 'Redirecting…' : 'Get $30 / year — best value'}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
