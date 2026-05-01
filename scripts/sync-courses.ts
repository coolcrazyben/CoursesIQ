/**
 * Sync all MSU courses from Banner SSB into the `courses` table.
 *
 * Pages through ALL sections for a given term (6000+ for Fall 2026),
 * deduplicates to unique (subject, course_number) pairs, and upserts
 * with course title and term_code.
 *
 * Usage:
 *   export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/sync-courses.ts
 *   npx tsx scripts/sync-courses.ts --term 202630
 *
 * Run once per semester when registration opens.
 */

import axios from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import { createClient } from '@supabase/supabase-js'

const BANNER_BASE = 'https://mybanner.msstate.edu/StudentRegistrationSsb/ssb'
const PAGE_SIZE = 500

// Parse --term flag or default to Fall 2026
const termArg = process.argv.indexOf('--term')
const TERM_CODE = termArg !== -1 ? process.argv[termArg + 1] : '202630'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BannerSection {
  subject: string
  courseNumber: string
  courseTitle: string
  courseReferenceNumber: string
}

async function main() {
  console.log(`\nSyncing courses from Banner SSB — term ${TERM_CODE}\n`)

  // Set up axios with cookie jar
  const jar = new CookieJar()
  const client = wrapper(axios.create({ jar, timeout: 15000, headers: { 'User-Agent': 'CoursesIQ/1.0' } }))

  // Establish Banner session
  await client.post(
    `${BANNER_BASE}/term/search?mode=search`,
    `term=${TERM_CODE}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' } }
  )
  console.log('Session established.')

  // Reset data form
  await client.post(`${BANNER_BASE}/classSearch/resetDataForm`, null, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })

  // Fetch page 0 to get totalCount
  const first = await fetchPage(client, TERM_CODE, 0)
  const total: number = first.totalCount
  console.log(`Total sections in Banner: ${total}`)

  const allSections: BannerSection[] = [...(first.data ?? [])]

  // Fetch remaining pages
  const pages = Math.ceil(total / PAGE_SIZE)
  for (let page = 1; page < pages; page++) {
    process.stdout.write(`  Fetching page ${page + 1}/${pages}…\r`)
    await client.post(`${BANNER_BASE}/classSearch/resetDataForm`, null, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
    const result = await fetchPage(client, TERM_CODE, page * PAGE_SIZE)
    allSections.push(...(result.data ?? []))
  }
  console.log(`\nFetched ${allSections.length} total sections.`)

  // Deduplicate to unique (subject, course_number) — keep first title seen
  const seen = new Map<string, { subject: string; course_number: string; title: string; term_code: string }>()
  for (const s of allSections) {
    const key = `${s.subject}|${s.courseNumber}`
    if (!seen.has(key)) {
      seen.set(key, {
        subject: s.subject,
        course_number: s.courseNumber,
        title: s.courseTitle ?? null,
        term_code: TERM_CODE,
      })
    }
  }

  const rows = Array.from(seen.values())
  console.log(`Unique courses: ${rows.length}`)

  // Upsert in batches of 500
  let inserted = 0
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('courses')
      .upsert(batch, { onConflict: 'subject,course_number,term_code' })
    if (error) {
      console.error(`Upsert error at batch ${i}:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    process.stdout.write(`  Upserted ${inserted}/${rows.length} courses…\r`)
  }

  console.log(`\nDone. ${rows.length} courses synced for term ${TERM_CODE}.\n`)
}

async function fetchPage(client: ReturnType<typeof wrapper>, term: string, offset: number) {
  const res = await client.get(`${BANNER_BASE}/searchResults/searchResults`, {
    params: { txt_term: term, pageOffset: offset, pageMaxSize: PAGE_SIZE },
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  return res.data as { success: boolean; totalCount: number; data: BannerSection[] | null }
}

main().catch(err => { console.error(err); process.exit(1) })
