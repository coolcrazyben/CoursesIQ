import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import CourseSearch from '@/components/CourseSearch'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscription'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const email = user?.email ?? ''
  const initials = email ? email[0].toUpperCase() : '?'
  const plan = user ? await getUserPlan(user.id) : 'free'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar plan={plan} />
      <header className="fixed top-0 right-0 w-[calc(100%-280px)] z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 flex justify-between items-center h-16 px-8">
        <div className="flex items-center flex-1 max-w-xl">
          <CourseSearch />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-50 rounded-md transition-colors text-gray-400">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-bold text-primary-container truncate max-w-[180px]">{email || 'MSU Student'}</p>
              <Link
                href="/auth/logout"
                className="text-[10px] text-gray-500 uppercase hover:text-primary-container transition-colors"
              >
                Sign out
              </Link>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold select-none">
              {initials}
            </div>
          </div>
        </div>
      </header>
      <main className="ml-[280px] pt-16 min-h-screen">
        {children}
      </main>
    </div>
  )
}
