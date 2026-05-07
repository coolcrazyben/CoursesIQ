import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const referrer_code = user.id.replace(/-/g, '').slice(0, 8)

  // Upsert: insert if not exists, return existing if already there
  const { data: existing } = await adminClient
    .from('referrals')
    .select('referrer_code')
    .eq('referrer_user_id', user.id)
    .maybeSingle()

  if (!existing) {
    await adminClient.from('referrals').insert({
      referrer_user_id: user.id,
      referrer_code,
    })
  }

  const code = existing?.referrer_code ?? referrer_code
  const share_url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://coursesiq.com'}/?ref=${code}`

  return NextResponse.json({ referrer_code: code, share_url })
}
