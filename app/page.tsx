import { adminClient } from '@/lib/supabase/admin'
import AlertForm from '@/components/AlertForm'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Fetch live count of active alerts — server-side, bypasses RLS via adminClient
  const { count, error } = await adminClient
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const activeCount = error ? 0 : (count ?? 0)

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-maroon text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Never miss an open seat at MSU.
          </h1>
          <p className="mt-4 text-lg text-white/90 leading-relaxed">
            We text you the second a seat opens in your course — before anyone
            else knows. No account. No app. Completely free.
          </p>
          {activeCount > 0 && (
            <p className="mt-6 text-white/80 text-sm">
              <span className="font-semibold text-white">{activeCount.toLocaleString()}</span>{' '}
              {activeCount === 1 ? 'student is' : 'students are'} watching for open seats right now.
            </p>
          )}
        </div>
      </section>

      {/* Alert Registration Form */}
      <section className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Set up your seat alert
          </h2>
          <AlertForm />
        </div>
      </section>
    </main>
  )
}
