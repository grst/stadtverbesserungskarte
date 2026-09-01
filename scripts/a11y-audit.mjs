#!/usr/bin/env node
/**
 * Barrierefreiheitsprüfung mit axe-core über die wichtigsten Ansichten.
 *
 * Voraussetzung: `npm run preview` (oder `npm run dev`) läuft.
 * Aufruf: node scripts/a11y-audit.mjs [basis-url]
 *
 * Prüft gegen WCAG 2.2 AA. Verstöße der Stufen „critical“ und „serious“
 * lassen das Skript scheitern.
 */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const baseUrl = process.argv[2] ?? 'http://localhost:4173'
const executablePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'

const routes = [
  { name: 'Karte', path: '/' },
  { name: 'Karte, nur Radverkehr', path: '/?ebene=radverkehr' },
  { name: 'Detail', path: '/vorschlag/bahnhofstrasse-radfahrstreifen' },
  { name: 'Liste', path: '/', clickListToggle: true },
  { name: 'Info', path: '/info' },
  { name: 'Idee einreichen', path: '/idee-einreichen' },
]

const viewports = [
  { name: 'mobil', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]

const failures = []
let checked = 0

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'de-DE',
  })
  const page = await context.newPage()

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' })
    if (route.clickListToggle) {
      await page.locator('.chip-view').click()
      await page.waitForTimeout(300)
    }
    // Kartentiles laden asynchron; axe soll den fertigen Zustand sehen.
    await page.waitForTimeout(1200)

    await page.evaluate(axeSource)
    const result = await page.evaluate(async () => {
      // @ts-expect-error axe wird oben injiziert
      return await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      })
    })

    checked++
    for (const violation of result.violations) {
      if (violation.impact !== 'critical' && violation.impact !== 'serious') continue
      failures.push(
        `[${viewport.name}] ${route.name}: ${violation.id} (${violation.impact}) – ${violation.help}\n      ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join('\n      ')}`,
      )
    }
  }

  await context.close()
}

await browser.close()

if (failures.length) {
  console.error(`\n✖ ${failures.length} Verstoß/Verstöße (critical/serious):\n`)
  for (const failure of failures) console.error(`  • ${failure}`)
  console.error('')
  process.exitCode = 1
} else {
  console.log(`✔ ${checked} Ansichten geprüft, keine Verstöße der Stufen critical oder serious.`)
}
