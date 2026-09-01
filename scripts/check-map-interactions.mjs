/**
 * Prüft, dass die Karte ohne vorheriges Anklicken bedienbar ist: Mausrad zoomt,
 * Ziehen verschiebt, Wischen verschiebt – und dass die Tastaturbedienung dabei
 * erhalten bleibt.
 *
 * Hintergrund: OpenLayers erzeugt seine Standardinteraktionen mit
 * `onFocusOnly: true`. Sobald das Zielelement ein `tabindex` trägt (nötig für
 * die Tastaturbedienung), reagieren Mausrad und Ziehen dann erst, wenn der
 * Fokus in der Karte liegt – man müsste die Karte erst anklicken. Genau diese
 * Regression fängt dieses Skript ab.
 *
 * Gemessen werden Zoomstufe und Mittelpunkt der Karte. Dafür braucht es das
 * Handle `window.__olMap`, das nur der Entwicklungsserver setzt – dieses Skript
 * läuft deshalb gegen `npm run dev`, nicht gegen die Preview.
 *
 * Aufruf: node scripts/check-map-interactions.mjs [basisUrl]
 */
import { chromium } from 'playwright-core'

const baseUrl = process.argv[2] ?? 'http://localhost:5173'
const executablePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'

const browser = await chromium.launch({ executablePath })
const failures = []

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✔ ${label}`)
  } else {
    console.log(`  ✖ ${label} (${detail})`)
    failures.push(label)
  }
}

/** Zoomstufe und Mittelpunkt der Karte aus der Seite lesen. */
function readView(page) {
  return page.evaluate(() => {
    const map = window.__olMap
    if (!map) return null
    const view = map.getView()
    const center = view.getCenter()
    return { zoom: view.getZoom(), x: center[0], y: center[1] }
  })
}

async function openMap(options) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const view = await readView(page)
  if (!view) {
    console.error(
      `✖ ${baseUrl} stellt kein window.__olMap bereit. Läuft dort der Entwicklungsserver (npm run dev)?`,
    )
    process.exit(1)
  }
  return { context, page }
}

const settle = (page) => page.waitForTimeout(900)
const moved = (before, after) => Math.hypot(after.x - before.x, after.y - before.y) > 50
const zoomedIn = (before, after) => after.zoom > before.zoom + 0.2

// ------------------------------------------------------------------ Maus/Rad
{
  const { context, page } = await openMap({ viewport: { width: 1440, height: 900 } })
  const box = await page.locator('.mapview-canvas').boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height * 0.35

  console.log('Maus (1440×900), ohne vorherigen Klick:')
  const start = await readView(page)

  await page.mouse.move(cx, cy)
  await page.mouse.wheel(0, -600)
  await settle(page)
  const afterWheel = await readView(page)
  check(
    'Mausrad zoomt beim ersten Ereignis',
    zoomedIn(start, afterWheel),
    `Zoom ${start.zoom.toFixed(2)} → ${afterWheel.zoom.toFixed(2)}`,
  )

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(cx - step * 24, cy + step * 10)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await settle(page)
  const afterDrag = await readView(page)
  check(
    'Ziehen verschiebt beim ersten Versuch',
    moved(afterWheel, afterDrag),
    `Mittelpunkt unverändert bei ${Math.round(afterDrag.x)},${Math.round(afterDrag.y)}`,
  )
  await context.close()
}

// ------------------------------------------------------------------ Tastatur
{
  const { context, page } = await openMap({ viewport: { width: 1440, height: 900 } })
  console.log('Tastatur (Karte fokussiert):')
  const start = await readView(page)

  await page.locator('.mapview-canvas').focus()
  await page.keyboard.press('ArrowRight')
  await settle(page)
  const afterArrow = await readView(page)
  check('Pfeiltasten verschieben', moved(start, afterArrow), 'Mittelpunkt unverändert')

  await page.keyboard.press('+')
  await settle(page)
  const afterPlus = await readView(page)
  check(
    'Plus zoomt',
    zoomedIn(afterArrow, afterPlus),
    `Zoom ${afterArrow.zoom.toFixed(2)} → ${afterPlus.zoom.toFixed(2)}`,
  )
  await context.close()
}

// --------------------------------------------------------------------- Touch
{
  const { context, page } = await openMap({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const box = await page.locator('.mapview-canvas').boundingBox()
  const cx = Math.round(box.x + box.width / 2)
  const cy = Math.round(box.y + box.height * 0.3)
  const cdp = await context.newCDPSession(page)
  const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints })

  console.log('Touch (390×844), ohne vorheriges Antippen:')
  const start = await readView(page)

  await touch('touchStart', [{ x: cx, y: cy }])
  for (let step = 1; step <= 10; step += 1) {
    await touch('touchMove', [{ x: cx - step * 18, y: cy + step * 4 }])
    await page.waitForTimeout(20)
  }
  await touch('touchEnd', [])
  await settle(page)
  const afterSwipe = await readView(page)
  check('Wischen verschiebt beim ersten Versuch', moved(start, afterSwipe), 'Mittelpunkt unverändert')

  await touch('touchStart', [
    { x: cx - 40, y: cy, id: 1 },
    { x: cx + 40, y: cy, id: 2 },
  ])
  for (let step = 1; step <= 8; step += 1) {
    await touch('touchMove', [
      { x: cx - 40 - step * 8, y: cy, id: 1 },
      { x: cx + 40 + step * 8, y: cy, id: 2 },
    ])
    await page.waitForTimeout(20)
  }
  await touch('touchEnd', [])
  await settle(page)
  const afterPinch = await readView(page)
  check(
    'Aufziehen zoomt',
    zoomedIn(afterSwipe, afterPinch),
    `Zoom ${afterSwipe.zoom.toFixed(2)} → ${afterPinch.zoom.toFixed(2)}`,
  )

  // Die Seite muss weiterhin bis zur Fußzeile scrollbar sein – über die
  // Kopf-/Chipleiste, denn das Wischen auf der Karte gehört jetzt der Karte.
  await page.evaluate(() => window.scrollTo({ top: 0 }))
  const chipbar = await page.locator('.chipbar').boundingBox()
  const y = Math.round(chipbar.y + chipbar.height / 2)
  await touch('touchStart', [{ x: 200, y }])
  for (let step = 1; step <= 10; step += 1) {
    await touch('touchMove', [{ x: 200, y: y - step * 25 }])
    await page.waitForTimeout(16)
  }
  await touch('touchEnd', [])
  await page.waitForTimeout(700)
  const scrolled = await page.evaluate(() => Math.round(window.scrollY))
  check('Wischen auf der Chipleiste scrollt zur Fußzeile', scrolled > 0, `scrollY ${scrolled}`)
  await context.close()
}

await browser.close()

if (failures.length > 0) {
  console.error(`\n✖ ${failures.length} Prüfung(en) fehlgeschlagen: ${failures.join('; ')}`)
  process.exit(1)
}
console.log('\n✔ Karteninteraktionen in Ordnung (kein vorheriger Klick nötig).')
