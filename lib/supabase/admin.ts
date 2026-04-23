import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS.
// ONLY use in cron routes (GET /api/cron/check-seats).
// Never import this in Client Components or pages.
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)
