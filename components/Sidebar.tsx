'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', icon: 'dashboard',       label: 'Dashboard',        exact: true },
  { href: '/course',    icon: 'search',           label: 'Course Search'               },
  { href: '/planner',   icon: 'calendar_today',   label: 'Schedule Builder'            },
]

interface SidebarProps {
  plan: 'free' | 'pro'
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ plan, open = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={`fixed left-0 top-0 h-full w-[280px] z-50 bg-[#601020] text-white flex flex-col py-6 border-r border-white/10 shadow-xl transition-transform duration-200 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Close button — mobile only */}
      <button
        className="md:hidden absolute top-4 right-4 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        onClick={onClose}
        aria-label="Close menu"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Logo */}
      <Link href="/" className="px-6 mb-8 flex items-center gap-3 hover:opacity-90 transition-opacity" onClick={onClose}>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white leading-none">Coursesiq</h1>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">Student Portal</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {nav.map(({ href, icon, label, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href + label}
              href={href}
              onClick={onClose}
              className={active
                ? 'flex items-center gap-3 bg-white text-[#601020] rounded-full px-4 py-3 mx-2 font-semibold shadow-sm'
                : 'flex items-center gap-3 text-white/70 hover:text-white px-4 py-3 mx-2 transition-colors hover:bg-white/10 rounded-lg'
              }
            >
              <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 mt-auto pt-4 border-t border-white/10 space-y-1">
        {plan === 'pro' ? (
          <button
            onClick={async () => {
              const res = await fetch('/api/stripe/portal', { method: 'POST' })
              if (!res.ok) return
              const data = await res.json()
              if (data.redirect) window.location.href = data.redirect
              else if (data.url) window.location.href = data.url
            }}
            className="w-full flex items-center gap-3 text-green-300 hover:text-white px-4 py-2 transition-colors hover:bg-white/10 rounded-lg text-sm font-semibold"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span>Manage Subscription</span>
          </button>
        ) : (
          <Link href="/upgrade" onClick={onClose} className="flex items-center gap-3 text-yellow-300 hover:text-white px-4 py-2 transition-colors hover:bg-white/10 rounded-lg text-sm font-semibold">
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span>Upgrade to Pro</span>
          </Link>
        )}
        <Link href="/about" onClick={onClose} className="flex items-center gap-3 text-white/50 hover:text-white px-4 py-2 transition-colors hover:bg-white/10 rounded-lg text-sm">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
          <span>About</span>
        </Link>
      </div>
    </aside>
  )
}
