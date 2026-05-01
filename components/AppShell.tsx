'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import CourseSearch from '@/components/CourseSearch'
import { signOut } from '@/app/actions/auth'

interface AppShellProps {
  email: string
  initials: string
  plan: 'free' | 'pro'
  children: React.ReactNode
}

export default function AppShell({ email, initials, plan, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar plan={plan} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="fixed top-0 left-0 right-0 md:left-[280px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center h-16 px-4 md:px-8 gap-3">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="flex items-center flex-1 min-w-0">
          <CourseSearch />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="hidden sm:block p-2 hover:bg-gray-50 rounded-md transition-colors text-gray-400">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-3 sm:border-l sm:border-gray-200">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-primary-container truncate max-w-[160px]">{email || 'MSU Student'}</p>
              <form action={signOut}>
                <button type="submit" className="text-[10px] text-gray-500 uppercase hover:text-primary-container transition-colors bg-transparent border-none cursor-pointer p-0">
                  Sign out
                </button>
              </form>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold select-none shrink-0">
              {initials}
            </div>
          </div>
        </div>
      </header>

      <main className="ml-0 md:ml-[280px] pt-16 min-h-screen">
        {children}
      </main>
    </div>
  )
}
