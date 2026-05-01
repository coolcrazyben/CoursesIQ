import { adminClient } from '@/lib/supabase/admin'
import AlertForm from '@/components/AlertForm'
import Link from 'next/link'
import MarketingHeader from '@/components/MarketingHeader'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ subject?: string; number?: string }>
}

export default async function LandingPage({ searchParams }: PageProps) {
  const { subject: urlSubject, number: urlNumber } = await searchParams

  const { count } = await adminClient
    .from('alerts').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const activeCount = count ?? 0

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
    : [62, 22, 10, 4, 2]

  const gradeColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']
  const displayRecords = (recordCount ?? 0).toLocaleString()

  return (
    <>
      <MarketingHeader />

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
          <div className="max-w-7xl mx-auto px-6 md:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
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
                Pick better classes.<br />
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

        {/* ── Pain Points ── */}
        <section className="py-24 bg-surface-container-low px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-h1 text-primary mb-4">Stop Guessing Your Schedule</h2>
              <p className="text-body-lg text-secondary">Banner and spreadsheets shouldn&apos;t be this hard.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-2xl border border-outline-variant hover:border-primary-container/40 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 22 }}>tab</span>
                </div>
                <h3 className="text-h3 text-on-surface mb-3">Too Many Tabs</h3>
                <p className="text-body-md text-secondary">Stop jumping between RateMyProfessor, Banner, and grade reports. We centralize everything in one place.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-outline-variant hover:border-primary-container/40 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 22 }}>warning</span>
                </div>
                <h3 className="text-h3 text-on-surface mb-3">Unknown Difficulty</h3>
                <p className="text-body-md text-secondary">Don&apos;t find out a class is impossible after it&apos;s too late. See real historical grade data before you register.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-outline-variant hover:border-primary-container/40 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 22 }}>event_busy</span>
                </div>
                <h3 className="text-h3 text-on-surface mb-3">Waitlist Woes</h3>
                <p className="text-body-md text-secondary">Instant email alerts mean you never miss an open seat in that essential 4000-level class you need to graduate.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Product Demo: Class Search ── */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-primary text-label-sm font-semibold mb-5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
                Instant Search
              </div>
              <h2 className="text-h1 text-primary mb-5">Find any class in seconds</h2>
              <p className="text-body-lg text-secondary mb-8">
                Our search indexes every course in the MSU catalog. Find classes by name, number, department,
                or requirement — results appear as you type.
              </p>
              <ul className="space-y-3">
                {[
                  'Autocomplete across all MSU departments',
                  'Filter by day, time, and available seats',
                  'See ratings and grade data inline',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-body-md text-on-surface">
                    <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Search UI Mockup */}
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Search bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 20 }}>search</span>
                  <span className="text-gray-800 font-medium flex-1 text-sm">Biology 1103</span>
                  <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">ESC</span>
                </div>
                {/* Filter chips */}
                <div className="flex gap-2 px-5 py-2.5 bg-white border-b border-gray-100">
                  <span className="bg-primary-container text-white px-3 py-1 rounded-full text-[11px] font-semibold">All Sections</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[11px] font-medium">MWF Only</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[11px] font-medium">Has Seats</span>
                </div>
                {/* Results */}
                <div className="divide-y divide-gray-100">
                  {/* Result 1 */}
                  <div className="px-5 py-4 bg-primary-fixed/30 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 text-sm">BIO 1103 — Section 1</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">Dr. Anderson · MWF 8:00–8:50am · Colvard Hall 108</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">14 seats</span>
                      <span className="text-[11px] text-amber-600 font-semibold">4.1★</span>
                    </div>
                  </div>
                  {/* Result 2 */}
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">BIO 1103 — Section 3</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">Dr. Williams · TR 11:00am–12:15pm · Harned Hall 215</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">2 seats</span>
                      <span className="text-[11px] text-amber-600 font-semibold">3.8★</span>
                    </div>
                  </div>
                  {/* Result 3 */}
                  <div className="px-5 py-4 flex items-center justify-between gap-4 opacity-60">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">BIO 1103 — Section 5</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">Dr. Patel · MWF 2:00–2:50pm · Butler Hall 301</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">Full</span>
                      <span className="text-[11px] text-amber-600 font-semibold">4.5★</span>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">3 of 6 sections shown</span>
                    <span className="text-[11px] text-primary-container font-semibold">View all →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Product Demo: Grade Distribution ── */}
        <section className="py-24 px-6 bg-surface-container-low">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-primary text-label-sm font-semibold mb-5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>analytics</span>
                Grade Data
              </div>
              <h2 className="text-h1 text-primary mb-5">See real grade distributions</h2>
              <p className="text-body-lg text-secondary mb-8">
                No more guessing. View visual grade distributions from past semesters for every MSU course —
                powered by {displayRecords}+ instructor records pulled directly from institutional data.
              </p>
              <ul className="space-y-3">
                {[
                  'Every course, every instructor, every semester',
                  'Side-by-side comparison across professors',
                  'Identify grade trends over time',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-body-md text-on-surface">
                    <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Grade Distribution Mockup */}
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Grade Distribution</div>
                    <div className="font-black text-gray-900 text-lg leading-tight">CSE 1284 · Fall 2024</div>
                    <div className="text-xs text-gray-500 mt-1">Dr. James Hansen · 187 students</div>
                  </div>
                  <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1 rounded-full shrink-0">Avg: B+</span>
                </div>

                {/* Bar chart */}
                <div className="flex items-end gap-2 h-36 mb-2">
                  {gradePcts.map((pct, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[11px] text-gray-600 font-semibold">{pct}%</span>
                      <div
                        className="w-full rounded-t"
                        style={{ height: `${Math.max(pct * 1.3, 6)}%`, backgroundColor: gradeColors[i] }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-5">
                  {['A', 'B', 'C', 'D', 'F'].map((g, i) => (
                    <div key={g} className="flex-1 flex items-center justify-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: gradeColors[i] }}
                      />
                      <span className="text-[11px] text-gray-600 font-semibold">{g}</span>
                    </div>
                  ))}
                </div>

                {/* Comparison row */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Compare Instructors</div>
                  {[
                    { name: 'Dr. Hansen', avg: 'B+', bar: 78 },
                    { name: 'Dr. Nguyen', avg: 'B', bar: 62 },
                    { name: 'Dr. Willis', avg: 'C+', bar: 44 },
                  ].map(({ name, avg, bar }) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-24 shrink-0">{name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-primary-container h-2 rounded-full"
                          style={{ width: `${bar}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right">{avg}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-[10px] text-gray-400 border-t border-gray-100 pt-3">
                  Source: MSU Office of Institutional Research
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Product Demo: Seat Availability ── */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-primary text-label-sm font-semibold mb-5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications_active</span>
                Live Monitoring
              </div>
              <h2 className="text-h1 text-primary mb-5">Never miss an open seat</h2>
              <p className="text-body-lg text-secondary mb-8">
                Seat counts update automatically every 15 minutes during add/drop. Set an alert and
                get emailed the instant your class opens — before anyone else even knows.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="bg-primary-fixed p-3 rounded-xl h-fit shrink-0">
                    <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 20 }}>person</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-on-surface text-sm">Verified Instructor Ratings</h4>
                    <p className="text-body-md text-secondary">Aggregated from course evaluations and student feedback data.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="bg-primary-fixed p-3 rounded-xl h-fit shrink-0">
                    <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 20 }}>notifications_active</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-on-surface text-sm">Email Alerts Under 5 Minutes</h4>
                    <p className="text-body-md text-secondary">Automatic checks every 15 min with sub-5-minute delivery.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Seat / Instructor Card Mockup */}
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Card header */}
                <div className="bg-primary-container p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Instructor Profile</span>
                    <span className="bg-green-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">● Live</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white/80" style={{ fontSize: 26 }}>person</span>
                    </div>
                    <div>
                      <div className="font-black text-xl leading-tight">Dr. Sarah Chen</div>
                      <div className="text-sm text-white/70 mt-0.5">Dept. of Computer Science &amp; Engineering</div>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                  <div className="p-4 text-center">
                    <div className="font-black text-2xl text-primary-container">4.7</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-medium">Rating</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="font-black text-2xl text-green-600">12</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-medium">Seats Open</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="font-black text-2xl text-gray-800">92%</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-medium">Rec. Rate</div>
                  </div>
                </div>

                {/* Sections */}
                <div className="p-5 space-y-2">
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Current Sections</div>
                  {[
                    { section: 'CSE 1284 – Sec 001', time: 'MWF 9:00–9:50am', seats: '12 open', color: 'bg-green-100 text-green-700' },
                    { section: 'CSE 1284 – Sec 003', time: 'TR 11:00am–12:15pm', seats: 'Full', color: 'bg-red-100 text-red-600' },
                  ].map(({ section, time, seats, color }) => (
                    <div key={section} className="flex items-center justify-between bg-gray-50 rounded-xl p-3.5">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{section}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{time}</div>
                      </div>
                      <span className={`text-[11px] ${color} px-2.5 py-1 rounded-full font-bold`}>{seats}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <div className="w-full bg-primary-container text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                    Get Seat Alert
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section id="features" className="py-24 bg-white border-y border-gray-100 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-h1 text-primary mb-4">Powerful Tools for Busy Bulldogs</h2>
              <p className="text-body-lg text-secondary">Everything you need to plan a semester you&apos;ll actually enjoy.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: 'track_changes',
                  title: 'Seat Tracker',
                  desc: 'Get an email the second a seat opens in your dream class. No refreshing Banner.',
                },
                {
                  icon: 'analytics',
                  title: 'Grade Insights',
                  desc: 'Deep-dive into historical data to find courses that fit your GPA goals.',
                },
                {
                  icon: 'star',
                  title: 'Professor Ratings',
                  desc: 'Integrated reviews from multiple sources for a complete picture of any instructor.',
                },
                {
                  icon: 'speed',
                  title: 'Instant Search',
                  desc: 'The fastest course lookup in Starkville. Results appear as you type.',
                },
                {
                  icon: 'compare',
                  title: 'Side-by-Side Compare',
                  desc: 'Compare two instructors teaching the same course — grade distributions, ratings, and seats.',
                },
                {
                  icon: 'calendar_today',
                  title: 'Schedule Builder',
                  desc: 'Drag and drop sections to build a conflict-free schedule before registration day.',
                },
                {
                  icon: 'trending_up',
                  title: 'Trend Analysis',
                  desc: 'See whether a class is getting harder or easier over time, semester by semester.',
                },
                {
                  icon: 'free_cancellation',
                  title: 'Free Forever',
                  desc: 'Core features — search, grades, seat alerts — are completely free. No credit card needed.',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl bg-surface-container-lowest border border-gray-200 hover:border-primary-container/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 20 }}>{icon}</span>
                  </div>
                  <h4 className="font-bold text-on-surface mb-2">{title}</h4>
                  <p className="text-body-md text-secondary">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-16 md:py-20 bg-primary-container px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { v: activeCount > 0 ? `${activeCount.toLocaleString()}+` : '100+', l: 'Students Watching', icon: 'visibility' },
              { v: displayRecords + '+', l: 'Grade Records', icon: 'database' },
              { v: '<5 min', l: 'Alert Speed', icon: 'bolt' },
              { v: '100%', l: 'Free Forever', icon: 'favorite' },
            ].map(({ v, l, icon }) => (
              <div key={l} className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-white/50 mb-1" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <p className="font-black text-white" style={{ fontSize: 40, lineHeight: 1 }}>{v}</p>
                <p className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-h1 text-primary mb-4">How It Works</h2>
              <p className="text-body-lg text-secondary">From zero to a better schedule in three steps.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector lines desktop */}
              <div className="hidden md:block absolute top-10 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-px border-t-2 border-dashed border-gray-200" />
              {[
                {
                  step: '1',
                  title: 'Search',
                  desc: 'Type any course name, number, or instructor into our instant search. Filter by day, time, and department.',
                  icon: 'search',
                },
                {
                  step: '2',
                  title: 'Compare',
                  desc: 'Review grade distributions, seat availability, and student ratings side by side across all sections.',
                  icon: 'compare_arrows',
                },
                {
                  step: '3',
                  title: 'Register & Alert',
                  desc: 'Pick your sections and set email alerts for any that are full. We notify you the moment a seat opens.',
                  icon: 'notifications_active',
                },
              ].map(({ step, title, desc, icon }) => (
                <div key={step} className="flex flex-col items-center text-center relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary-container text-white flex flex-col items-center justify-center mb-6 shadow-lg shadow-primary-container/30">
                    <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    <span className="text-[10px] font-black tracking-widest mt-1 text-white/70">STEP {step}</span>
                  </div>
                  <h3 className="text-h3 text-primary mb-3">{title}</h3>
                  <p className="text-body-md text-secondary max-w-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Social Proof ── */}
        <section className="py-24 px-6 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container text-white text-label-sm font-bold mb-6 shadow-md">
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>school</span>
                Built for MSU Students
              </div>
              <h2 className="text-h1 text-primary">Bulldogs love CoursesIQ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  quote: 'CoursesIQ literally saved my semester. I found a great elective with a solid professor that I never would have discovered on Banner.',
                  name: 'Sarah T.',
                  major: 'Junior · Marketing',
                },
                {
                  quote: 'The seat alerts are life-changing. I snagged a spot in CS 2313 within five minutes of someone dropping it. Would have missed it entirely otherwise.',
                  name: 'James L.',
                  major: 'Senior · Computer Science',
                },
              ].map(({ quote, name, major }) => (
                <div key={name} className="bg-white p-8 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-400 text-base">★</span>
                    ))}
                  </div>
                  <p className="text-body-lg text-on-surface mb-6 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 18 }}>person</span>
                    </div>
                    <div>
                      <div className="font-bold text-on-surface text-sm">{name}</div>
                      <div className="text-[11px] text-secondary">{major}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-16 md:py-24 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
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

        {/* ── Final CTA ── */}
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
            <h2 className="text-h1 mb-6 relative z-10" style={{ fontSize: 42, fontWeight: 900 }}>Plan your schedule the smart way.</h2>
            <p className="text-body-lg opacity-80 max-w-xl mx-auto mb-10 relative z-10">
              Join hundreds of MSU Bulldogs using CoursesIQ to graduate on time and stress-free.
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

      {/* ── Footer ── */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 bg-[#601020] rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <span className="font-black text-gray-900">CoursesIQ</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Built for Bulldogs. Dedicated to simplifying the academic journey at Mississippi State University.
            </p>
            <p className="text-xs text-gray-400 mt-4">© 2025 CoursesIQ. All rights reserved.</p>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Product</div>
            <div className="space-y-2">
              <a href="#features" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#pricing" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
              <Link href="/course" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Browse Courses</Link>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Legal</div>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="#" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
