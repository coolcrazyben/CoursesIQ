import MarketingHeader from '@/components/MarketingHeader'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} CoursesIQ · Mississippi State University
      </footer>
    </div>
  )
}
