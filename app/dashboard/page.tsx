import { parsePhoneNumber } from 'libphonenumber-js'
import { adminClient } from '@/lib/supabase/admin'
import DashboardAlerts from '@/components/DashboardAlerts'

interface PageProps {
  searchParams: Promise<{ phone?: string }>
}

type Alert = {
  id: string
  crn: string
  subject: string
  course_number: string
  course_name: string | null
  created_at: string
}

async function fetchAlertsForPhone(rawPhone: string): Promise<Alert[]> {
  let e164: string
  try {
    const parsed = parsePhoneNumber(rawPhone, 'US')
    if (!parsed || !parsed.isValid()) return []
    e164 = parsed.number
  } catch {
    return []
  }

  const { data, error } = await adminClient
    .from('alerts')
    .select('id, crn, subject, course_number, course_name, created_at')
    .eq('phone_number', e164)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[dashboard] Supabase fetch error:', error.message)
    return []
  }

  return data ?? []
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Next.js 15: searchParams is a Promise — MUST await
  const { phone } = await searchParams

  const alerts: Alert[] = phone ? await fetchAlertsForPhone(phone) : []
  const hasSearched = Boolean(phone)

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-maroon mb-2">My Alerts</h1>
      <p className="text-gray-600 mb-8">
        Enter your phone number to view and manage your active seat alerts.
      </p>

      {/* Phone lookup form — plain GET form, no JavaScript required */}
      <form method="GET" action="/dashboard" className="flex gap-2 mb-8">
        <input
          type="tel"
          name="phone"
          defaultValue={phone ?? ''}
          placeholder="(601) 555-1234"
          required
          className="flex-1 px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
        />
        <button
          type="submit"
          className="bg-maroon text-white px-5 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Look up
        </button>
      </form>

      {/* Results section — only shown after form submission */}
      {hasSearched && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Active alerts for{' '}
            <span className="text-maroon">{phone}</span>
          </h2>
          <DashboardAlerts alerts={alerts} />
        </section>
      )}
    </main>
  )
}
