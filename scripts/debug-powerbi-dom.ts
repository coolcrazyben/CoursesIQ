/**
 * Diagnostic: dump Power BI table DOM structure so we can find the right selectors.
 * Run: npx tsx scripts/debug-powerbi-dom.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'

const REPORT_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiY2Q1MGY5NDYtM2E1NS00NjQwLTkzNjQtMTIxZjdlYTFiODU2IiwidCI6ImVkNTFkYmIwLWFmODYtNDVhMi05Yzk3LTczZmIzOTM1ZGYxNyIsImMiOjN9'

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  console.log('Loading...')
  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Wait for something to render
  await page.waitForTimeout(8000)

  // Dump all unique class names and roles present on the page
  const info = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('*'))

    // Collect all roles
    const roles = [...new Set(
      allEls
        .map(el => el.getAttribute('role'))
        .filter(Boolean)
    )]

    // Collect class name fragments that look table-related
    const tableClasses = [...new Set(
      allEls.flatMap(el =>
        Array.from(el.classList).filter(c =>
          /table|row|cell|grid|pivot|matrix|visual/i.test(c)
        )
      )
    )]

    // Get inner text of first few potential data cells
    const gridCells = Array.from(document.querySelectorAll('[role="gridcell"]'))
      .slice(0, 20)
      .map(el => (el as HTMLElement).innerText?.trim())

    const rows = Array.from(document.querySelectorAll('[role="row"]'))
      .slice(0, 5)
      .map(el => (el as HTMLElement).innerText?.replace(/\n/g, ' | ').trim())

    // Sample of the full HTML around anything that looks like a table
    const tableEl = document.querySelector('[role="grid"], [role="table"], .tableEx, .pivotTable')
    const tableHtml = tableEl ? tableEl.outerHTML.slice(0, 3000) : '(no table element found)'

    return { roles, tableClasses, gridCells, rows, tableHtml }
  })

  console.log('\n=== ROLES ===')
  console.log(info.roles)

  console.log('\n=== TABLE-RELATED CLASSES ===')
  console.log(info.tableClasses)

  console.log('\n=== GRID CELLS (first 20) ===')
  console.log(info.gridCells)

  console.log('\n=== ROW TEXT (first 5) ===')
  info.rows.forEach((r, i) => console.log(`Row ${i}: ${r}`))

  console.log('\n=== TABLE HTML SAMPLE ===')
  console.log(info.tableHtml)

  fs.writeFileSync('./data/powerbi-dom-debug.json', JSON.stringify(info, null, 2))
  console.log('\nFull output saved to ./data/powerbi-dom-debug.json')

  await browser.close()
}

main().catch(err => { console.error(err); process.exit(1) })
