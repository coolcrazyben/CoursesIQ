import type { Metadata } from 'next'
import Link from 'next/link'
export const metadata: Metadata = { title: 'About — CoursesIQ' }

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <h1 className="text-h1 text-primary mb-2">About CoursesIQ</h1>
      <p className="text-body-lg text-secondary mb-10">
        Free seat alerts and course intelligence for Mississippi State University students.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {[
          { icon: 'hourglass_empty', title: 'Waitlist Tracker', body: 'We check Banner every 5 minutes and email you instantly when a seat opens in your course.' },
          { icon: 'analytics',       title: 'Grade History',    body: 'View historical grade distributions by professor and semester to make smarter registration choices.' },
          { icon: 'school',          title: 'Built for MSU',    body: 'CoursesIQ is purpose-built for Mississippi State University students.' },
          { icon: 'star',            title: 'Professor Ratings', body: 'Rate My Professor data displayed alongside grade distributions so you have full context.' },
        ].map(({ icon, title, body }) => (
          <div key={title} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center text-primary-container mb-4">
              <span className="material-symbols-outlined">{icon}</span>
            </div>
            <h3 className="text-h3 text-on-surface mb-2">{title}</h3>
            <p className="text-body-md text-secondary">{body}</p>
          </div>
        ))}
      </div>

      <div className="bg-primary-container text-white rounded-2xl p-8 text-center">
        <h3 className="text-h2 mb-3">Ready to get started?</h3>
        <p className="text-body-lg opacity-80 mb-6">Set up a free seat alert or look up grade data for any MSU course.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/#alert-form" className="bg-white text-primary-container px-6 py-3 rounded-full font-bold hover:shadow-lg transition-all">Set Up an Alert</Link>
          <Link href="/course"      className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full font-bold hover:bg-white/20 transition-all">Browse Grade Data</Link>
        </div>
      </div>
    </div>
  )
}
