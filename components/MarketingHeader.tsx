'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 bg-[#601020] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <span className="font-black text-lg text-gray-900 tracking-tight">CoursesIQ</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">How It Works</a>
          <a href="#pricing" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">Pricing</a>
          <Link href="/course" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">Browse Courses</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="bg-[#601020] text-white px-4 py-2 md:px-5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-6 py-3 flex flex-col">
          <a href="#features" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-gray-700 border-b border-gray-100">Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-gray-700 border-b border-gray-100">How It Works</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-gray-700 border-b border-gray-100">Pricing</a>
          <Link href="/course" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-gray-700">Browse Courses</Link>
        </nav>
      )}
    </header>
  )
}
