import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Twilio uses Node.js native modules not in Next.js built-in externals list.
  // Must be explicit here AND routes must export `const runtime = 'nodejs'`.
  serverExternalPackages: ['twilio'],
}

export default nextConfig
