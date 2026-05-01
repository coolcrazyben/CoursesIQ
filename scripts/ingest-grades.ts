/**
 * Ingest MSU IR grade distribution data into Supabase.
 *
 * Usage:
 *   npx tsx scripts/ingest-grades.ts --file ./data/grades.xlsx
 *   npx tsx scripts/ingest-grades.ts --file ./data/grades.csv
 *
 * Column mapping (flexible — auto-detects common MSU IR header variants):
 *   Subject / SUBJ          → subject
 *   Course Number / CRSE    → course_number
 *   Section / SECT          → section
 *   Instructor / Professor  → professor
 *   Term                    → term
 *   A / A Grade / A Count   → a_count
 *   B / B Grade / B Count   → b_count
 *   C / C Grade / C Count   → c_count
 *   D / D Grade / D Count   → d_count
 *   F / F Grade / F Count   → f_count
 *   W / Withdrawn           → w_count
 *   Total / Enrollment      → total_students
 *   GPA / Avg GPA           → avg_gpa
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const fileArgIdx = args.indexOf('--file')
if (fileArgIdx === -1 || !args[fileArgIdx + 1]) {
  console.error('Usage: npx tsx scripts/ingest-grades.ts --file <path/to/grades.xlsx|.csv>')
  process.exit(1)
}
const filePath = path.resolve(args[fileArgIdx + 1])

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Parse file
// ---------------------------------------------------------------------------

function loadRows(fp: string): Record<string, string | number | null>[] {
  const ext = path.extname(fp).toLowerCase()
  const workbook = XLSX.readFile(fp, { cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(sheet, {
    defval: null,
    raw: false,  // keep as strings so we can trim
  })
  console.log(`Loaded ${rows.length} rows from ${ext} (sheet: "${sheetName}")`)
  return rows
}

// ---------------------------------------------------------------------------
// Column auto-detection
// ---------------------------------------------------------------------------

type ColMap = {
  subject: string | null
  course_number: string | null
  section: string | null
  professor: string | null
  term: string | null
  a_count: string | null
  b_count: string | null
  c_count: string | null
  d_count: string | null
  f_count: string | null
  w_count: string | null
  total_students: string | null
  avg_gpa: string | null
}

function findCol(headers: string[], ...candidates: string[]): string | null {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
}

function detectColumns(headers: string[]): ColMap {
  return {
    subject:        findCol(headers, 'subject', 'subj', 'dept', 'department'),
    course_number:  findCol(headers, 'course number', 'crse', 'course_number', 'course no', 'course'),
    section:        findCol(headers, 'section', 'sect', 'sec'),
    professor:      findCol(headers, 'instructor', 'professor', 'faculty', 'teacher', 'instructor name'),
    term:           findCol(headers, 'term', 'semester', 'term description', 'semester description'),
    a_count:        findCol(headers, 'a_count', 'a', 'a count', 'a grade', 'grade a', 'num a'),
    b_count:        findCol(headers, 'b_count', 'b', 'b count', 'b grade', 'grade b', 'num b'),
    c_count:        findCol(headers, 'c_count', 'c', 'c count', 'c grade', 'grade c', 'num c'),
    d_count:        findCol(headers, 'd_count', 'd', 'd count', 'd grade', 'grade d', 'num d'),
    f_count:        findCol(headers, 'f_count', 'f', 'f count', 'f grade', 'grade f', 'num f'),
    w_count:        findCol(headers, 'w_count', 'w', 'w count', 'withdrawn', 'withdrawals', 'num w'),
    total_students: findCol(headers, 'total_students', 'total', 'enrollment', 'total students', 'class size', 'total enrolled'),
    avg_gpa:        findCol(headers, 'avg_gpa', 'avg gpa', 'average gpa', 'gpa', 'mean gpa'),
  }
}

// ---------------------------------------------------------------------------
// Row → record
// ---------------------------------------------------------------------------

function toNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(String(val).replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? null : n
}

function toInt(val: string | number | null | undefined): number | null {
  const n = toNum(val)
  return n === null ? null : Math.round(n)
}

function calcGpa(a: number | null, b: number | null, c: number | null, d: number | null, f: number | null): number | null {
  const grades = [
    [a, 4], [b, 3], [c, 2], [d, 1], [f, 0],
  ] as [number | null, number][]
  const validGrades = grades.filter(([count]) => count !== null && count > 0) as [number, number][]
  if (validGrades.length === 0) return null
  const totalPoints = validGrades.reduce((sum, [count, pts]) => sum + count * pts, 0)
  const totalStudents = validGrades.reduce((sum, [count]) => sum + count, 0)
  if (totalStudents === 0) return null
  return Math.round((totalPoints / totalStudents) * 100) / 100
}

interface GradeRow {
  subject: string
  course_number: string
  section: string | null
  professor: string | null
  term: string
  term_code: string | null
  a_count: number | null
  b_count: number | null
  c_count: number | null
  d_count: number | null
  f_count: number | null
  w_count: number | null
  total_students: number | null
  avg_gpa: number | null
}

function mapRow(row: Record<string, string | number | null>, cols: ColMap): GradeRow | null {
  const subject = cols.subject ? String(row[cols.subject] ?? '').trim().toUpperCase() : ''
  const courseNumber = cols.course_number ? String(row[cols.course_number] ?? '').trim() : ''
  const term = cols.term ? String(row[cols.term] ?? '').trim() : ''

  if (!subject || !courseNumber || !term) return null

  const a = toInt(cols.a_count ? row[cols.a_count] : null)
  const b = toInt(cols.b_count ? row[cols.b_count] : null)
  const c = toInt(cols.c_count ? row[cols.c_count] : null)
  const d = toInt(cols.d_count ? row[cols.d_count] : null)
  const f = toInt(cols.f_count ? row[cols.f_count] : null)
  const w = toInt(cols.w_count ? row[cols.w_count] : null)

  const totalFromCols = toInt(cols.total_students ? row[cols.total_students] : null)
  const calculatedTotal = [a, b, c, d, f, w].filter(x => x !== null).reduce((s, x) => s! + x!, 0)
  const total = totalFromCols ?? (calculatedTotal > 0 ? calculatedTotal : null)

  const gpaFromFile = cols.avg_gpa ? toNum(row[cols.avg_gpa]) : null
  const gpa = gpaFromFile ?? calcGpa(a, b, c, d, f)

  return {
    subject,
    course_number: courseNumber,
    section: cols.section ? String(row[cols.section] ?? '').trim() || null : null,
    professor: cols.professor ? String(row[cols.professor] ?? '').trim() || null : null,
    term,
    term_code: null,
    a_count: a,
    b_count: b,
    c_count: c,
    d_count: d,
    f_count: f,
    w_count: w,
    total_students: total,
    avg_gpa: gpa !== null ? Math.round(gpa * 100) / 100 : null,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nIngesting: ${filePath}\n`)

  const rows = loadRows(filePath)
  if (rows.length === 0) {
    console.error('No rows found in file.')
    process.exit(1)
  }

  const headers = Object.keys(rows[0])
  console.log('Detected columns:', headers.join(', '))

  const cols = detectColumns(headers)
  console.log('\nColumn mapping:')
  for (const [field, col] of Object.entries(cols)) {
    console.log(`  ${field.padEnd(16)} ← ${col ?? '(not found)'}`)
  }

  if (!cols.subject || !cols.course_number || !cols.term) {
    console.error('\nCannot map required columns (subject, course_number, term). Check headers and update the script.')
    process.exit(1)
  }

  let processed = 0, skipped = 0, upserted = 0

  // Process in batches of 500
  const BATCH = 500
  const records: GradeRow[] = []

  for (const row of rows) {
    processed++
    const record = mapRow(row, cols)
    if (!record) { skipped++; continue }
    records.push(record)
  }

  console.log(`\nParsed ${records.length} valid records (${skipped} skipped)\n`)

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase
      .from('grade_distributions')
      .insert(batch)

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} error:`, error.message)
    } else {
      upserted += batch.length
      process.stdout.write(`  Upserted ${upserted}/${records.length}...\r`)
    }
  }

  console.log(`\n\nDone! Processed: ${processed} | Upserted: ${upserted} | Skipped: ${skipped}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
