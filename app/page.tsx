import { adminClient } from '@/lib/supabase/admin'
import AlertForm from '@/components/AlertForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ subject?: string; number?: string }>
}

export default async function LandingPage({ searchParams }: PageProps) {
  const { subject: urlSubject, number: urlNumber } = await searchParams

  // Active alert count
  const { count } = await adminClient
    .from('alerts').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const activeCount = count ?? 0

  // Real grade distribution data — MSU-wide aggregates
  const { data: gradeRows } = await adminClient
    .from('grade_distributions')
    .select('a_count, b_count, c_count, d_count, f_count, total_students')
  const { count: recordCount } = await adminClient
    .from('grade_distributions').select('*', { count: 'exact', head: true })

  const totals = { a: 0, b: 0, c: 0, d: 0, f: 0 }
  for (const row of gradeRows ?? []) {
    totals.a += row.a_count ?? 0
    totals.b += row.b_count ?? 0
    totals.c += row.c_count ?? 0
    totals.d += row.d_count ?? 0
    totals.f += row.f_count ?? 0
  }
  const gradeSum = totals.a + totals.b + totals.c + totals.d + totals.f
  const gradePcts = gradeSum > 0
    ? [
        Math.round(totals.a / gradeSum * 100),
        Math.round(totals.b / gradeSum * 100),
        Math.round(totals.c / gradeSum * 100),
        Math.round(totals.d / gradeSum * 100),
        Math.round(totals.f / gradeSum * 100),
      ]
    : [65, 20, 9, 3, 3]

  const gradeColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']
  const displayRecords = (recordCount ?? 0).toLocaleString()

  return (
    <>
      {/* ── Marketing Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 bg-[#601020] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <span className="font-black text-lg text-gray-900 tracking-tight">CoursesIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/course" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">Courses</Link>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">Pricing</a>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-[#601020] font-medium transition-colors">Dashboard</Link>
          </nav>
          <Link
            href="/dashboard"
            className="bg-[#601020] text-white px-5 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-white py-20 lg:py-28">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 10% 60%, #ffdadb50 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, #ffdadb30 0%, transparent 55%)',
            }}
          />
          <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center relative z-10">
            {/* Left copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm mb-6 font-semibold">
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>school</span>
                Designed for Mississippi State University
              </div>

              <h1
                className="text-primary mb-5"
                style={{ fontSize: 54, lineHeight: 1.06, letterSpacing: '-0.03em', fontWeight: 900 }}
              >
                Know your courses.<br />
                <span className="text-primary-container">Own your schedule.</span>
              </h1>

              <p className="text-body-lg text-secondary mb-8 max-w-lg">
                Real grade distributions for every MSU course. Email alerts the instant
                a waitlisted seat opens. Free, forever.
              </p>

              {activeCount > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-fixed/60 text-primary text-label-sm mb-8 font-semibold">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-bold">{activeCount.toLocaleString()}</span> students watching right now
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <a
                  href="#alert-form"
                  className="bg-primary-container text-white px-7 py-3.5 rounded-full text-body-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all hover:opacity-90"
                >
                  Get Seat Alerts
                  <span className="material-symbols-outlined">arrow_forward</span>
                </a>
                <a
                  href="/course"
                  className="border-2 border-primary-container text-primary-container px-7 py-3.5 rounded-full text-body-lg font-semibold hover:bg-primary-fixed/30 transition-colors"
                >
                  Browse Grade Data
                </a>
              </div>
            </div>

            {/* Right — AlertForm card */}
            <div
              id="alert-form"
              className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant shadow-xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-white"
                    style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                  >
                    notifications_active
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-on-surface leading-tight">Set up a seat alert</h2>
                  <p className="text-xs text-secondary">Email you when enrollment opens</p>
                </div>
              </div>
              <AlertForm initialSubject={urlSubject} initialCourse={urlNumber} />
            </div>
          </div>
        </section>

        {/* ── Features Bento ── */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="text-h1 text-primary mb-4">Built for Student Success</h2>
              <p className="text-body-lg text-secondary">The tools you need to get the classes you want.</p>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
              {/* Grade data card — real chart */}
              <a
                href="/course"
                className="md:col-span-8 bg-white p-8 rounded-2xl border border-gray-200 flex flex-col justify-between group hover:shadow-xl transition-shadow min-h-[320px]"
              >
                <div>
                  <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary-container mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                  <h3 className="text-h2 text-primary mb-3">Historical Grade Data</h3>
                  <p className="text-body-md text-secondary max-w-md">
                    View grade distributions from previous semesters across all MSU courses —
                    powered by {displayRecords}+ instructor records.
                  </p>
                </div>

                <div className="mt-8">
                  <p className="text-xs text-secondary uppercase tracking-wider mb-3 font-semibold">
                    MSU-Wide Grade Distribution
                  </p>
                  <div className="flex items-end gap-2 h-28 px-1">
                    {gradePcts.map((pct, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-secondary font-medium">{pct}%</span>
                        <div
                          className="w-full rounded-t transition-all"
                          style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: gradeColors[i] }}
                        />
                        <span className="text-[10px] text-secondary font-semibold">
                          {['A', 'B', 'C', 'D', 'F'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </a>

              {/* Seat alert card */}
              <div className="md:col-span-4 bg-primary-container p-8 rounded-2xl flex flex-col justify-between text-white min-h-[320px]">
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined">hourglass_empty</span>
                  </div>
                  <h3 className="text-h2 mb-3">Seat Alerts</h3>
                  <p className="text-body-md text-white/80">
                    Get emailed the second a seat opens in your must-have class.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-label-sm uppercase tracking-wider text-white/60">Monitoring</span>
                    <span className="bg-green-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">LIVE</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['CSE 1284', 'Tracking — Waitlist #4'],
                      ['BIO 1134', 'Seat opened — Emailed!'],
                    ].map(([course, status]) => (
                      <div key={course} className="flex items-center gap-3 bg-white/10 p-2 rounded-lg">
                        <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications_active</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{course}</p>
                          <p className="text-[10px] text-white/60">{status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-20 bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { v: activeCount > 0 ? `${activeCount.toLocaleString()}+` : '100+', l: 'Students Watching' },
              { v: displayRecords + '+', l: 'Grade Records' },
              { v: '<5 min', l: 'Alert Speed' },
              { v: '100%', l: 'Free Forever' },
            ].map(({ v, l }) => (
              <div key={l}>
                <p className="text-primary-container mb-2 font-extrabold" style={{ fontSize: 36 }}>{v}</p>
                <p className="text-label-sm uppercase tracking-widest text-secondary">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center mb-14">
              <h2 className="text-h1 text-primary mb-3">Simple, transparent pricing</h2>
              <p className="text-body-lg text-secondary">Start free. Upgrade when you need more.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Free */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8">
                <p className="text-label-sm text-secondary uppercase tracking-widest mb-3">Free</p>
                <p className="font-black text-on-surface mb-1" style={{ fontSize: 42 }}>$0</p>
                <p className="text-sm text-secondary mb-8">Forever free</p>
                <ul className="space-y-3 mb-8">
                  {['1 seat alert', '1 saved schedule', 'Grade distributions', 'Professor ratings', 'Course search'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-green-500" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className="block w-full text-center border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Get started free
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-primary-container rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
                <p className="text-label-sm text-white/60 uppercase tracking-widest mb-3">Pro</p>
                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="font-black" style={{ fontSize: 42 }}>$5</p>
                    <p className="text-white/70 text-sm">/ month</p>
                  </div>
                  <p className="text-white/70 text-sm">or <strong className="text-white">$30 / year</strong> — save $30</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited seat alerts', 'Unlimited schedules', 'Grade distributions', 'Professor ratings', 'Course search', 'Priority support'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white">
                      <span className="material-symbols-outlined text-green-300" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className="block w-full text-center bg-white text-primary-container py-3 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
                >
                  Start for $5 / month
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-secondary mt-8">
              Payments processed securely by Stripe. Cancel anytime.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-8">
          <div className="max-w-5xl mx-auto bg-primary-container rounded-[40px] p-16 text-center text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <h2 className="text-h1 mb-6 relative z-10">Ready to never miss a seat?</h2>
            <p className="text-body-lg opacity-80 max-w-xl mx-auto mb-10 relative z-10">
              Join hundreds of MSU students who get instant alerts the moment enrollment opens up.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <a
                href="#alert-form"
                className="bg-white text-primary-container px-10 py-4 rounded-full font-bold hover:shadow-xl transition-all hover:scale-105"
              >
                Set Up a Free Alert
              </a>
              <a
                href="/course"
                className="bg-white/10 border border-white/20 text-white px-10 py-4 rounded-full font-bold hover:bg-white/20 transition-all"
              >
                Browse Grade Data
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
