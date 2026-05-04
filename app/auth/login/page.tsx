'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const [nextPath, setNextPath] = useState('/planner')
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSent, setSignupSent] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawNext = params.get('next')
    const isSafeInternalPath = (path: string) => /^\/[^/]/.test(path) && !path.startsWith('//')
    if (rawNext && isSafeInternalPath(rawNext)) setNextPath(rawNext)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) {
        setError(err.message || 'Sign in failed. Please try again.')
      } else {
        window.location.replace(nextPath)
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setLoading(false)
      if (err) {
        setError(err.message)
      } else {
        setSignupSent(true)
      }
    }
  }

  if (signupSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-green-600">mark_email_read</span>
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Check your email</h2>
          <p className="text-sm text-gray-500">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#601020] rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900">CoursesIQ</h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Student Portal</p>
          </div>
        </div>

        <h2 className="font-semibold text-gray-900 mb-1">
          {mode === 'signin' ? 'Sign in to your planner' : 'Create your account'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'signin' ? 'Enter your email and password to continue.' : 'Choose a password to get started.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#601020]/30"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#601020]/30"
          />
          {mode === 'signup' && (
            <input
              type="password"
              required
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#601020]/30"
            />
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#601020] text-white py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-5">
          {mode === 'signin' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(null) }} className="text-[#601020] font-semibold hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(null) }} className="text-[#601020] font-semibold hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
