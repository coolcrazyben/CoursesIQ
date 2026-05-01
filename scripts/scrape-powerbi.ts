/**
 * Scrape MSU Grade Distribution from public Power BI report.
 * Strategy: discover all Course Department filter values by scrolling the dropdown,
 * then reload the page fresh for each department and scrape that slice.
 *
 * Usage:
 *   npx tsx scripts/scrape-powerbi.ts
 *   npx tsx scripts/scrape-powerbi.ts --out ./data/grades.csv
 *   npx tsx scripts/scrape-powerbi.ts --resume          (skip depts already in partial.csv)
 *   npx tsx scripts/scrape-powerbi.ts --diagnose        (dumps DOM info to diagnose selectors)
 *   npx tsx scripts/scrape-powerbi.ts --list-depts      (just print all dept names and exit)
 */

import { chromium, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const REPORT_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiY2Q1MGY5NDYtM2E1NS00NjQwLTkzNjQtMTIxZjdlYTFiODU2IiwidCI6ImVkNTFkYmIwLWFmODYtNDVhMi05Yzk3LTczZmIzOTM1ZGYxNyIsImMiOjN9'

const args = process.argv.slice(2)
const outArgIdx = args.indexOf('--out')
const outFile = path.resolve(outArgIdx !== -1 ? args[outArgIdx + 1] : './data/grades.csv')
const partialFile = outFile.replace(/\.csv$/, '.partial.csv')
const deptCacheFile = outFile.replace(/\.csv$/, '.depts.json')
const DIAGNOSE = args.includes('--diagnose')
const LIST_DEPTS = args.includes('--list-depts')
const RESUME = args.includes('--resume')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePct(s: string): number {
  return parseFloat(s.replace('%', '').trim()) / 100 || 0
}

const COURSE_RE = /^[A-Z]{2,4}\s+\d{3,4}[A-Z]?$/

interface RawDomRow { ariaRowindex: number; lines: string[] }

interface OutputRow {
  subject: string; course_number: string; professor: string
  enrolled: number; a_count: number; b_count: number; c_count: number
  d_count: number; f_count: number; w_count: number; avg_gpa: number | null
}

function buildOutputRow(subject: string, courseNumber: string, professor: string, lines: string[], offset = 2): OutputRow | null {
  const enrolled = parseInt((lines[offset] ?? '').replace(/,/g, ''), 10)
  if (isNaN(enrolled) || enrolled === 0) return null
  const a = Math.round(parsePct(lines[offset + 1]) * enrolled)
  const b = Math.round(parsePct(lines[offset + 2]) * enrolled)
  const c = Math.round(parsePct(lines[offset + 3]) * enrolled)
  const d = Math.round(parsePct(lines[offset + 4]) * enrolled)
  const f = Math.round(parsePct(lines[offset + 5]) * enrolled)
  const w = Math.round(parsePct(lines[offset + 6]) * enrolled)
  const graded = a + b + c + d + f
  const avg_gpa = graded > 0 ? Math.round(((a * 4 + b * 3 + c * 2 + d * 1) / graded) * 100) / 100 : null
  return { subject, course_number: courseNumber, professor, enrolled, a_count: a, b_count: b, c_count: c, d_count: d, f_count: f, w_count: w, avg_gpa }
}

function toCsvLine(row: OutputRow): string {
  return [row.subject, row.course_number, '', row.professor, 'All Terms',
    row.a_count, row.b_count, row.c_count, row.d_count, row.f_count, row.w_count,
    row.enrolled, row.avg_gpa ?? ''].join(',')
}

function processRawRows(rawRows: RawDomRow[]): OutputRow[] {
  const sorted = [...rawRows].sort((a, b) => a.ariaRowindex - b.ariaRowindex)
  const output: OutputRow[] = []
  const seen = new Set<string>()
  let curSubject = '', curCourse = ''

  for (const { lines } of sorted) {
    if (lines.length < 3) continue
    const first = lines[0].trim()
    if (COURSE_RE.test(first)) {
      const sp = first.lastIndexOf(' ')
      curSubject = first.slice(0, sp).trim()
      curCourse = first.slice(sp + 1).trim()
      const row = buildOutputRow(curSubject, curCourse, '', lines, 2)
      if (row) { const k = `${curSubject}-${curCourse}-`; if (!seen.has(k)) { seen.add(k); output.push(row) } }
    } else if (curSubject && first && first.toLowerCase() !== 'total' && first.toLowerCase() !== 'course') {
      const row = buildOutputRow(curSubject, curCourse, first, lines, 2)
      if (row) { const k = `${curSubject}-${curCourse}-${first}`; if (!seen.has(k)) { seen.add(k); output.push(row) } }
    }
  }
  return output
}

const CSV_HEADER = 'subject,course_number,section,professor,term,a_count,b_count,c_count,d_count,f_count,w_count,total_students,avg_gpa'

// ---------------------------------------------------------------------------
// Diagnostic helper — run with --diagnose to inspect the DOM
// ---------------------------------------------------------------------------

async function diagnose(page: Page) {
  console.log('\n=== DIAGNOSTIC MODE ===\n')

  const info = await page.evaluate(() => {
    const result: Record<string, unknown> = {}

    // Check for expand/collapse buttons
    const expandSelectors = [
      'i[role="button"][aria-label="Collapsed"]',
      'i[role="button"][aria-label="Expand"]',
      '[aria-label="Expand"]',
      '[aria-label="Expand row"]',
      'button[aria-label*="expand" i]',
      'button[aria-label*="collapse" i]',
      '[class*="expand"]',
      '[class*="collapse"]',
    ]
    result.expandButtons = expandSelectors.map(sel => ({
      selector: sel,
      count: document.querySelectorAll(sel).length,
      sample: (document.querySelector(sel) as HTMLElement)?.outerHTML?.slice(0, 200),
    }))

    // Check slicer containers
    const slicerSelectors = [
      '.visual-slicer',
      '[data-testid*="slicer"]',
      '.slicer-dropdown-menu',
      '[class*="slicer"]',
    ]
    result.slicers = slicerSelectors.map(sel => ({
      selector: sel,
      count: document.querySelectorAll(sel).length,
      texts: Array.from(document.querySelectorAll(sel)).map(el => (el as HTMLElement).innerText?.slice(0, 80).replace(/\n/g, '|')),
    }))

    // Check for pivot table scrollable container
    const scrollSelectors = [
      '.pivotTable',
      '.scrollRegion',
      '.bodyCells',
      '.scroll-node',
      '[class*="scroll"]',
      '[role="grid"]',
    ]
    result.scrollables = scrollSelectors.map(sel => {
      const el = document.querySelector(sel) as HTMLElement
      return {
        selector: sel,
        found: !!el,
        scrollHeight: el?.scrollHeight,
        clientHeight: el?.clientHeight,
        overflow: el ? getComputedStyle(el).overflow + ' / ' + getComputedStyle(el).overflowY : null,
      }
    })

    // Check row counts
    const grid = document.querySelector('[role="grid"]')
    result.gridAriaRowcount = grid?.getAttribute('aria-rowcount')
    result.visibleRows = document.querySelectorAll('[role="row"][aria-rowindex]').length

    return result
  })

  console.log(JSON.stringify(info, null, 2))
  console.log('\n=== END DIAGNOSTIC ===\n')
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

async function collectVisible(page: Page): Promise<RawDomRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="row"][aria-rowindex]'))
      .map(el => ({
        ariaRowindex: parseInt(el.getAttribute('aria-rowindex') ?? '0', 10),
        lines: ((el as HTMLElement).innerText ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean),
      }))
      .filter(r => r.ariaRowindex > 1)
  )
}

async function expandVisible(page: Page): Promise<number> {
  const count = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('i[role="button"][aria-label="Collapsed"]')) as HTMLElement[]
    btns.forEach(b => b.click())
    return btns.length
  })
  if (count > 0) {
    console.log(`    expand: clicked ${count} collapsed buttons`)
    await page.waitForTimeout(600)
  }
  return count
}

async function getTotalRowCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]')
    return parseInt(grid?.getAttribute('aria-rowcount') ?? '0', 10)
  })
}

async function scrapeCurrentView(page: Page, tableBox: { x: number; y: number; width: number; height: number }): Promise<OutputRow[]> {
  // Use content-based keys (not aria-rowindex) because Power BI recycles DOM nodes —
  // the same aria-rowindex can represent a completely different row after scrolling.
  const contentSeen = new Set<string>()
  const outputMap = new Map<string, OutputRow>()
  let curSubject = '', curCourse = ''

  const cx = tableBox.x + tableBox.width / 2
  const cy = tableBox.y + tableBox.height / 2
  await page.mouse.move(cx, cy)

  const processSnap = (rawRows: RawDomRow[]): number => {
    let newCount = 0
    const sorted = [...rawRows].sort((a, b) => a.ariaRowindex - b.ariaRowindex)
    for (const { lines } of sorted) {
      if (lines.length < 3) continue
      const first = lines[0].trim()
      // Content key: first line + up to 3 data fields (unique enough, handles recycled DOM nodes)
      const contentKey = lines.slice(0, Math.min(4, lines.length)).join('\x01')
      if (contentSeen.has(contentKey)) continue
      contentSeen.add(contentKey)
      newCount++

      if (COURSE_RE.test(first)) {
        const sp = first.lastIndexOf(' ')
        curSubject = first.slice(0, sp).trim()
        curCourse = first.slice(sp + 1).trim()
        const row = buildOutputRow(curSubject, curCourse, '', lines, 2)
        if (row) {
          const k = `${curSubject}-${curCourse}-`
          if (!outputMap.has(k)) outputMap.set(k, row)
        }
      } else if (curSubject && first && first.toLowerCase() !== 'total' && first.toLowerCase() !== 'course') {
        const row = buildOutputRow(curSubject, curCourse, first, lines, 2)
        if (row) {
          const k = `${curSubject}-${curCourse}-${first}`
          if (!outputMap.has(k)) outputMap.set(k, row)
        }
      }
    }
    return newCount
  }

  // NOTE: Do NOT use aria-rowcount as an exit condition — it reflects the pre-expansion
  // row count and causes premature exit before all courses are scrolled into view.
  const totalRows = await getTotalRowCount(page)
  if (totalRows > 0) console.log(`    grid aria-rowcount (informational): ${totalRows}`)

  // Pass 1: scroll down
  let noProgress = 0
  while (noProgress < 25) {
    await expandVisible(page)
    const rows = await collectVisible(page)
    const n = processSnap(rows)
    if (n > 0) {
      noProgress = 0
      console.log(`    captured ${outputMap.size} rows (${contentSeen.size} content keys seen)`)
    } else {
      noProgress++
    }
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(600)
  }

  // Pass 2: scroll back to top, second sweep to catch missed rows
  await page.mouse.wheel(0, -99999)
  await page.waitForTimeout(1000)
  noProgress = 0
  while (noProgress < 15) {
    await expandVisible(page)
    const rows = await collectVisible(page)
    const n = processSnap(rows)
    if (n > 0) noProgress = 0
    else noProgress++
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(600)
  }

  console.log(`    final: ${outputMap.size} rows`)
  return [...outputMap.values()]
}

// ---------------------------------------------------------------------------
// Department slicer helpers
// The dropdown list is also virtualized — must scroll it to discover all options.
// ---------------------------------------------------------------------------

// Click slicer, then scroll through the dropdown list to collect ALL option names.
// Uses mouse wheel (same technique as main table) since scrollTop doesn't trigger PBI virtualization.
// Leaves the dropdown OPEN.
async function openAndReadAllDepts(page: Page): Promise<string[]> {
  const slicer = page.locator('.visual-slicer').nth(2)
  await slicer.click()
  await page.waitForTimeout(1500)

  const OPTION_SELECTORS = [
    '.slicer-dropdown-popup [role="option"]',
    '.slicer-dropdown-popup .slicerItemContainer',
    '.slicer-dropdown-popup li',
    '[role="listbox"] [role="option"]',
    '[role="listbox"] li',
    '[role="option"]:not([aria-rowindex])',
  ]

  const readVisibleOptions = (): Promise<string[]> =>
    page.evaluate((selectors: string[]) => {
      for (const sel of selectors) {
        const items = Array.from(document.querySelectorAll(sel))
          .map(el => (el as HTMLElement).innerText?.trim())
          .filter(t => t && t.length > 0 && t.length < 80
            && !t.toLowerCase().includes('select all')
            && !t.toLowerCase().includes('(all)'))
        if (items.length > 0) return items
      }
      return [] as string[]
    }, OPTION_SELECTORS)

  // Get the dropdown panel's center coordinates so we can wheel-scroll over it
  const getDropdownCenter = (): Promise<{ x: number; y: number } | null> =>
    page.evaluate(() => {
      const containers = ['.slicer-dropdown-popup', '[role="listbox"]']
      for (const sel of containers) {
        const el = document.querySelector(sel)
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        }
      }
      return null
    })

  const allDepts = new Set<string>()
  let noProgressRounds = 0

  // Position the mouse over the dropdown so wheel events hit it
  const center = await getDropdownCenter()
  if (center) {
    await page.mouse.move(center.x, center.y)
    console.log(`  Dropdown found at (${Math.round(center.x)}, ${Math.round(center.y)}) — scrolling to collect all options...`)
  } else {
    console.log('  Warning: dropdown panel not found by selector — will still try wheel scrolling')
  }

  while (noProgressRounds < 15) {
    const before = allDepts.size
    const opts = await readVisibleOptions()
    opts.forEach(o => allDepts.add(o))

    if (allDepts.size > before) {
      noProgressRounds = 0
      console.log(`    ${allDepts.size} departments found so far...`)
    } else {
      noProgressRounds++
    }

    // Re-center over dropdown in case something moved
    const c = await getDropdownCenter()
    if (c) await page.mouse.move(c.x, c.y)

    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(400)
  }

  return [...allDepts].sort()
}

// With the dropdown OPEN, click the option matching dept name.
// Scrolls via mouse wheel (same as main table) since scrollTop doesn't trigger PBI virtualization.
async function clickDeptOption(page: Page, dept: string): Promise<boolean> {
  const OPTION_SELECTORS = [
    '.slicer-dropdown-popup [role="option"]',
    '.slicer-dropdown-popup .slicerItemContainer',
    '.slicer-dropdown-popup li',
    '[role="listbox"] [role="option"]',
    '[role="option"]:not([aria-rowindex])',
  ]

  const getDropdownCenter = (): Promise<{ x: number; y: number } | null> =>
    page.evaluate(() => {
      const containers = ['.slicer-dropdown-popup', '[role="listbox"]']
      for (const sel of containers) {
        const el = document.querySelector(sel)
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        }
      }
      return null
    })

  const tryClick = (): Promise<boolean> =>
    page.evaluate((args: { deptName: string; selectors: string[] }) => {
      for (const sel of args.selectors) {
        const match = Array.from(document.querySelectorAll(sel))
          .find(el => (el as HTMLElement).innerText?.trim() === args.deptName)
        if (match) { (match as HTMLElement).click(); return true }
      }
      return false
    }, { deptName: dept, selectors: OPTION_SELECTORS })

  // Scroll to top first: wheel up aggressively
  const c0 = await getDropdownCenter()
  if (c0) {
    await page.mouse.move(c0.x, c0.y)
    await page.mouse.wheel(0, -9999)
    await page.waitForTimeout(500)
  }

  // Scroll down through the dropdown looking for the option
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await tryClick()) {
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(2500) // wait for table to filter and re-render
      return true
    }

    const c = await getDropdownCenter()
    if (!c) break
    await page.mouse.move(c.x, c.y)
    await page.mouse.wheel(0, 250)
    await page.waitForTimeout(300)
  }

  return false
}

// ---------------------------------------------------------------------------
// Load the report fresh and wait for the pivot table to be ready
// ---------------------------------------------------------------------------
async function loadReport(page: Page): Promise<void> {
  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('[role="grid"]', { timeout: 30000 })
  await page.waitForTimeout(5000) // let Power BI fully render
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })

  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: false, slowMo: 50 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('Loading Power BI report...')
  await loadReport(page)

  if (DIAGNOSE) {
    await diagnose(page)
    await browser.close()
    return
  }

  // --- Discover all department names ---
  let depts: string[]

  if (fs.existsSync(deptCacheFile) && (RESUME || LIST_DEPTS)) {
    depts = JSON.parse(fs.readFileSync(deptCacheFile, 'utf8'))
    console.log(`Loaded ${depts.length} departments from cache: ${deptCacheFile}`)
  } else {
    console.log('\nOpening Course Department slicer to discover all departments...')
    depts = await openAndReadAllDepts(page)
    console.log(`\nFound ${depts.length} departments total:`)
    depts.forEach((d, i) => console.log(`  [${i}] ${d}`))

    // Cache the dept list so --resume works
    fs.writeFileSync(deptCacheFile, JSON.stringify(depts, null, 2), 'utf8')

    // Close the dropdown — we'll reopen per-dept via fresh page loads
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }

  if (LIST_DEPTS || depts.length === 0) {
    await browser.close()
    if (depts.length === 0) console.log('No departments found — run with --diagnose to inspect the DOM')
    return
  }

  // --- Determine which depts to skip (resume mode) ---
  const allOutputRows: OutputRow[] = []
  const globalSeen = new Set<string>()
  const completedDepts = new Set<string>()

  if (RESUME && fs.existsSync(partialFile)) {
    console.log(`\nResume mode: loading existing data from ${partialFile}`)
    const lines = fs.readFileSync(partialFile, 'utf8').split('\n').slice(1) // skip header
    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split(',')
      // subject,course_number,section,professor,term,a,b,c,d,f,w,total,gpa
      const subject = parts[0], course_number = parts[1], professor = parts[3]
      const k = `${subject}-${course_number}-${professor}`
      if (!globalSeen.has(k)) {
        globalSeen.add(k)
        // Reconstruct enough to write back
        allOutputRows.push({
          subject, course_number, professor,
          enrolled: parseInt(parts[11] || '0', 10),
          a_count: parseInt(parts[5] || '0', 10),
          b_count: parseInt(parts[6] || '0', 10),
          c_count: parseInt(parts[7] || '0', 10),
          d_count: parseInt(parts[8] || '0', 10),
          f_count: parseInt(parts[9] || '0', 10),
          w_count: parseInt(parts[10] || '0', 10),
          avg_gpa: parts[12] ? parseFloat(parts[12]) : null,
        })
      }
    }
    console.log(`  Loaded ${allOutputRows.length} existing rows`)

    // Figure out which depts already have data (by subject prefix)
    // We track completed depts via a separate JSON file
    const completedFile = deptCacheFile.replace('.depts.json', '.completed.json')
    if (fs.existsSync(completedFile)) {
      const completed: string[] = JSON.parse(fs.readFileSync(completedFile, 'utf8'))
      completed.forEach(d => completedDepts.add(d))
      console.log(`  Already completed ${completedDepts.size} departments`)
    }
  }

  const mergeRows = (rows: OutputRow[]) => {
    for (const r of rows) {
      const k = `${r.subject}-${r.course_number}-${r.professor}`
      if (!globalSeen.has(k)) { globalSeen.add(k); allOutputRows.push(r) }
    }
  }

  const savePartial = () => {
    fs.writeFileSync(partialFile, [CSV_HEADER, ...allOutputRows.map(toCsvLine)].join('\n'), 'utf8')
  }

  const saveCompleted = () => {
    const completedFile = deptCacheFile.replace('.depts.json', '.completed.json')
    fs.writeFileSync(completedFile, JSON.stringify([...completedDepts], null, 2), 'utf8')
  }

  // --- Iterate through each department ---
  // Key insight: reload the page fresh for each dept — this guarantees a clean
  // filter state without relying on the eraser button (which is unreliable).
  const deptsToProcess = depts.filter(d => !completedDepts.has(d))
  console.log(`\nDepartments to process: ${deptsToProcess.length} of ${depts.length}`)

  for (let i = 0; i < deptsToProcess.length; i++) {
    const dept = deptsToProcess[i]
    console.log(`\n[${i + 1}/${deptsToProcess.length}] Dept: "${dept}"`)

    // Reload page to guarantee clean filter state
    console.log('  Reloading page...')
    await loadReport(page)

    // Get table bounding box
    const pivotLocator = page.locator('.pivotTable')
    const tableBox = await pivotLocator.boundingBox()
    if (!tableBox) {
      console.log('  No pivot table found — skipping')
      continue
    }

    // Open dropdown and select this dept
    console.log(`  Selecting "${dept}" in slicer...`)
    await openAndReadAllDepts(page) // opens the dropdown
    const selected = await clickDeptOption(page, dept)
    if (!selected) {
      console.log(`  Could not find "${dept}" in dropdown — skipping`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      continue
    }
    console.log(`  Filter applied — scraping...`)

    // Scrape
    const outputRows = await scrapeCurrentView(page, tableBox)
    const instructorRows = outputRows.filter(r => r.professor !== '')
    const courseRows = outputRows.filter(r => r.professor === '')
    const expandedCourses = new Set(instructorRows.map(r => `${r.subject}-${r.course_number}`))
    const fallbacks = courseRows.filter(r => !expandedCourses.has(`${r.subject}-${r.course_number}`))
    const toMerge = [...instructorRows, ...fallbacks]
    mergeRows(toMerge)

    completedDepts.add(dept)
    console.log(`  +${toMerge.length} rows (${instructorRows.length} instructor, ${fallbacks.length} fallback) | total: ${allOutputRows.length}`)

    // Save progress after every dept
    savePartial()
    saveCompleted()
  }

  await browser.close()

  console.log(`\n\nTotal rows: ${allOutputRows.length}`)
  fs.writeFileSync(outFile, [CSV_HEADER, ...allOutputRows.map(toCsvLine)].join('\n'), 'utf8')
  console.log(`Written to ${outFile}`)
  console.log(`\nNext step:\n  export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/ingest-grades.ts --file ${outFile}`)
}

main().catch(err => { console.error(err); process.exit(1) })
