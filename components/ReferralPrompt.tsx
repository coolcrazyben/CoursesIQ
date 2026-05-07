'use client'

import { useEffect, useState } from 'react'

export default function ReferralPrompt() {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral', { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.share_url) {
          setShareUrl(data.share_url)
          try { sessionStorage.setItem('ref_code', data.referrer_code) } catch { /* ignore */ }
        }
      })
      .catch(() => null)
  }, [])

  if (!shareUrl) return null

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl!).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Track your MSU waitlists and grade data with CoursesIQ — free!')}&url=${encodeURIComponent(shareUrl)}`

  return (
    <div className="bg-[#5D1725]/5 border border-[#5D1725]/20 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="material-symbols-outlined text-[#5D1725]" style={{ fontVariationSettings: "'FILL' 1" }}>share</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Know someone fighting for a spot?</p>
          <p className="text-xs text-gray-500 mt-0.5">Share CoursesIQ and help them track their waitlist.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 truncate"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5D1725] text-white text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
          Tweet
        </a>
      </div>
    </div>
  )
}
