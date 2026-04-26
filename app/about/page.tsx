import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — CoursesIQ',
  description: "CoursesIQ sends MSU students an SMS the moment a seat opens in a course they're watching.",
}

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-maroon mb-4">About CoursesIQ</h1>
      <p className="text-gray-700 leading-relaxed">
        CoursesIQ is a free seat-alert service for Mississippi State University
        students. When a course fills up, you sign up with your CRN and phone
        number — we monitor Banner every few minutes and send you an SMS the
        instant a seat opens. No account, no app, no refreshing Banner
        obsessively. Just register your alert and go about your day.
      </p>
    </main>
  )
}
