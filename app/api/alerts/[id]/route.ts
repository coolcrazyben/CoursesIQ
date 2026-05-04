export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing alert id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: alertRecord } = await adminClient
    .from('alerts')
    .select('email')
    .eq('id', id)
    .single()
  if (!alertRecord || alertRecord.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await adminClient
    .from('alerts')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error('[api/alerts/[id]] Supabase update error:', error.message)
      return NextResponse.json({ error: 'Failed to cancel alert' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id }, { status: 200 })
}
