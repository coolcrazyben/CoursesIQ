import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subject = searchParams.get('subject')?.toUpperCase()
  const number = searchParams.get('number')

  if (!subject || !number) {
    return NextResponse.json({ error: 'subject and number are required' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('grade_distributions')
    .select('*')
    .eq('subject', subject)
    .eq('course_number', number)
    .order('term', { ascending: false })

  if (error) {
    console.error('[/api/grades] Supabase error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch grade data' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
