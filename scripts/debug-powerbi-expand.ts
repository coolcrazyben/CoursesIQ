/**
 * Diagnostic: find the actual expand button inside expandableCell.
 * Run: npx tsx scripts/debug-powerbi-expand.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'

const REPORT_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiY2Q1MGY5NDYtM2E1NS00NjQwLTkzNjQtMTIxZjdlYTFiODU2IiwidCI6ImVkNTFkYmIwLWFmODYtNDVhMi05Yzk3LTczZmIzOTM1ZGYxNyIsImMiOjN9'

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  console.log('Loading...')
  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('[role="grid"]', { timeout: 30000 })
  await page.waitForTimeout(3000)

  // Dump full inner HTML of first expandableCell
  const cellHtml = await page.evaluate(() => {
    const cell = document.querySelector('.expandableCell')
    return cell ? cell.outerHTML : 'NOT FOUND'
  })
  console.log('\n=== FIRST expandableCell FULL HTML ===')
  console.log(cellHtml)

  // Find all children of expandableCell
  const children = await page.evaluate(() => {
    const cell = document.querySelector('.expandableCell')
    if (!cell) return []
    return Array.from(cell.querySelectorAll('*')).map(el => ({
      tag: el.tagName,
      classes: el.className,
      role: el.getAttribute('role'),
      text: (el as HTMLElement).innerText?.slice(0, 30),
      html: el.outerHTML.slice(0, 150),
    }))
  })
  console.log('\n=== CHILDREN OF expandableCell ===')
  children.forEach((c, i) => console.log(`[${i}]`, JSON.stringify(c)))

  // Get bounding box of first expandableCell and its children
  const bbox = await page.locator('.expandableCell').first().boundingBox()
  console.log('\n=== BOUNDING BOX ===', bbox)

  // Try clicking at the far LEFT of the cell (where + icon appears)
  if (bbox) {
    console.log('\nClicking at left edge of cell (where + icon is)...')
    await page.mouse.click(bbox.x + 10, bbox.y + bbox.height / 2)
    await page.waitForTimeout(1500)

    const rowsAfter = await page.evaluate(() =>
      document.querySelectorAll('[role="row"][aria-rowindex]').length
    )
    console.log(`Rows after left-click: ${rowsAfter}`)

    // Dump first few row texts
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="row"][aria-rowindex]'))
        .slice(0, 8)
        .map(el => ({
          idx: el.getAttribute('aria-rowindex'),
          text: (el as HTMLElement).innerText?.replace(/\n/g, ' | ').trim().slice(0, 120),
        }))
    )
    console.log('\n=== ROWS AFTER CLICK ===')
    rows.forEach(r => console.log(JSON.stringify(r)))
  }

  fs.writeFileSync('./data/powerbi-expand-debug.json', JSON.stringify({ cellHtml, children }, null, 2))
  console.log('\nSaved to ./data/powerbi-expand-debug.json')
  console.log('Browser staying open 20s...')
  await page.waitForTimeout(20000)
  await browser.close()
}

main().catch(err => { console.error(err); process.exit(1) })
