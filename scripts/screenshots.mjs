#!/usr/bin/env node
/**
 * Entwicklungswerkzeug: fährt die laufende Seite mit dem System-Chromium an,
 * legt Screenshots in .tmp/screenshots/ ab und meldet Konsolenfehler.
 *
 * Voraussetzung: `npm run preview` oder `npm run dev` läuft.
 * Aufruf: node scripts/screenshots.mjs [basis-url]
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const baseUrl = process.argv[2] ?? 'http://localhost:4173'
const outDir = resolve('.tmp/screenshots')
mkdirSync(outDir, { recursive: true })

const executablePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'

const viewports = [
  { name: 'mobil', width: 390, height: 844, isMobile: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
]

const problems = []

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.isMobile,
    isMobile: viewport.isMobile,
    deviceScaleFactor: 2,
    locale: 'de-DE',
  })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`[${viewport.name}] console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`[${viewport.name}] pageerror: ${error.message}`))

  const shot = async (name) => {
    await page.screenshot({ path: resolve(outDir, `${viewport.name}-${name}.png`) })
  }

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shot('01-karte')

  // Detailansicht über das Explore-Panel öffnen
  const firstTile = page.locator('.sheet-strip .tile').first()
  await firstTile.click()
  // Lang genug warten, dass die einmalige Bewegung des Vergleichs durch ist.
  await page.waitForTimeout(1800)
  await shot('02-detail')

  // Vergleich umschalten. Über den Knopf und nicht über die Pfeiltasten: Das
  // Web Component schiebt den Regler, solange die Taste gedrückt ist, und
  // Playwrights `press()` ist dafür zu kurz.
  await page.locator('.beforeafter-mode', { hasText: 'Nachher' }).click()
  await page.waitForTimeout(400)
  await shot('03-detail-regler')

  // Zurück zur Karte, dann nur Radverkehr → Graph und Legende
  await page.goto(`${baseUrl}/?ebene=radverkehr`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await shot('04-graph')

  // Panel aufziehen (größte Stufe)
  const handle = page.locator('.sheet-grip')
  const box = await handle.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, 120, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(900)
    await shot('05-panel-offen')
  } else {
    problems.push(`[${viewport.name}] Kein Ziehgriff am Explore-Panel gefunden`)
  }

  // Listenansicht
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Als Liste anzeigen/ }).click()
  await page.waitForTimeout(400)
  await shot('06-liste')

  // Textseite
  await page.goto(`${baseUrl}/info`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await shot('07-info')

  await context.close()
}

await browser.close()

if (problems.length) {
  console.error('\n✖ Probleme:')
  for (const p of problems) console.error(`  • ${p}`)
  process.exitCode = 1
} else {
  console.log('✔ Keine Konsolenfehler; Screenshots in .tmp/screenshots/')
}
