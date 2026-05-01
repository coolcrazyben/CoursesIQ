import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { CURRENT_TERM_CODE } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json([])

  // Detect "SUBJECT NUMBER" pattern: e.g. "CSE 1011", "cse 10", "CSE1011"
  const combo = q.match(/^([a-zA-Z]+)\s*(\d+)$/)
  const subjectOnly = q.match(/^([a-zA-Z]+)$/)

  let query = adminClient
    .from('courses')
    .select('subject, course_number, title')
    .eq('term_code', CURRENT_TERM_CODE)
    .limit(15)

  if (combo) {
    // e.g. "CSE 1011" → subject starts with CSE, course_number starts with 1011
    const [, subj, num] = combo
    query = query
      .ilike('subject', `${subj}%`)
      .ilike('course_number', `${num}%`)
      .order('subject')
      .order('course_number')
  } else if (subjectOnly) {
    // e.g. "CSE" → subject starts with CSE
    query = query
      .ilike('subject', `${q}%`)
      .order('subject')
      .order('course_number')
  } else {
    // e.g. "intro", "computer" → title contains query
    query = query
      .ilike('title', `%${q}%`)
      .order('subject')
      .order('course_number')
  }

  const { data, error } = await query

  if (error) return NextResponse.json([], { status: 500 })

  return NextResponse.json(
    (data ?? []).map(row => ({
      subject: row.subject,
      course_number: row.course_number,
      title: row.title ?? null,
      label: row.title
        ? `${row.subject} ${row.course_number} — ${row.title}`
        : `${row.subject} ${row.course_number}`,
    }))
  )
}
