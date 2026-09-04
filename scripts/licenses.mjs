#!/usr/bin/env node
/**
 * Erzeugt `public/licenses.txt` – die Lizenzhinweise aller Pakete, die im
 * ausgelieferten Bundle landen.
 *
 * Hintergrund: Die meisten Lizenzen unserer Abhängigkeiten (MIT, BSD-2-Clause,
 * Apache-2.0, …) erlauben die Weitergabe nur, wenn Copyright-Vermerk und
 * Lizenztext mitgeliefert werden. Vite minifiziert die Lizenzkommentare aus dem
 * JavaScript heraus, also muss der Text als eigene Datei daneben liegen. Ein
 * sichtbarer Hinweis in der Oberfläche ist dagegen bei keiner dieser Lizenzen
 * gefordert – deshalb steht im Impressum nur ein Link hierher.
 *
 * Berücksichtigt werden `dependencies` und deren transitive `dependencies`,
 * nicht die `devDependencies`: Build-Werkzeuge wie Vite oder TypeScript werden
 * nicht weitergegeben.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'LICENSE-MIT',
  'COPYING',
  'COPYING.md',
]

/**
 * Sucht ein Paket so, wie Node es auflösen würde: erst im `node_modules` des
 * importierenden Pakets, dann in dem der übergeordneten Verzeichnisse. Damit
 * werden auch verschachtelte Installationen (Versionskonflikte) gefunden.
 */
function resolvePackageDir(name, fromDir) {
  let dir = fromDir
  for (;;) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    const parent = dirname(dir)
    if (parent === dir || dir === root) break
    dir = parent
  }
  return null
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** `license` kann ein String, ein Objekt oder (veraltet) `licenses[]` sein. */
function licenseName(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((entry) => entry.type ?? entry).join(' OR ')
  }
  return null
}

function licenseText(dir) {
  for (const file of LICENSE_FILES) {
    const path = join(dir, file)
    if (existsSync(path)) return { file, text: readFileSync(path, 'utf8').trim() }
  }
  return null
}

// ------------------------------------------------------------ Abhängigkeiten
const rootPkg = readJson(join(root, 'package.json'))
const collected = new Map()
const missing = new Set()

function walk(name, fromDir) {
  const dir = resolvePackageDir(name, fromDir)
  if (!dir) {
    missing.add(name)
    return
  }
  const pkg = readJson(join(dir, 'package.json'))
  const key = `${pkg.name}@${pkg.version}`
  if (collected.has(key)) return
  collected.set(key, {
    name: pkg.name,
    version: pkg.version,
    license: licenseName(pkg),
    homepage: pkg.homepage ?? pkg.repository?.url ?? null,
    ...(licenseText(dir) ?? { file: null, text: null }),
  })
  for (const dep of Object.keys(pkg.dependencies ?? {})) walk(dep, dir)
}

for (const dep of Object.keys(rootPkg.dependencies ?? {})) walk(dep, root)

const packages = [...collected.values()].sort((a, b) => a.name.localeCompare(b.name))

// ------------------------------------------------------------------- Ausgabe
const rule = '='.repeat(78)
const lines = [
  'Lizenzhinweise für Software von Dritten',
  `${rootPkg.description ?? rootPkg.name}`,
  '',
  'Diese Website nutzt die unten aufgeführten Open-Source-Pakete. Ihr Code ist',
  'im ausgelieferten JavaScript-Bundle enthalten; die zugehörigen Copyright-',
  'Vermerke und Lizenztexte stehen deshalb hier. Die Kartendaten selbst stammen',
  'von OpenStreetMap und stehen unter der Open Database License (ODbL); die',
  'Vektorkacheln liefert OpenFreeMap nach dem Schema von OpenMapTiles aus. Der',
  'Vermerk „OpenFreeMap © OpenMapTiles Data from OpenStreetMap“ ist in die Karte',
  'eingeblendet.',
  '',
  `Erzeugt von scripts/licenses.mjs – nicht von Hand bearbeiten.`,
  '',
  `Enthaltene Pakete (${packages.length}):`,
  ...packages.map((pkg) => `  - ${pkg.name}@${pkg.version} – ${pkg.license ?? 'Lizenz unbekannt'}`),
  '',
]

for (const pkg of packages) {
  lines.push(rule, `${pkg.name}@${pkg.version}`, '')
  if (pkg.license) lines.push(`Lizenz: ${pkg.license}`)
  if (pkg.homepage) lines.push(`Projektseite: ${pkg.homepage}`)
  lines.push('')
  if (pkg.text) {
    lines.push(pkg.text, '')
  } else {
    lines.push(
      `Dem Paket liegt keine Lizenzdatei bei. Der Lizenztext von ${pkg.license ?? '?'} gilt`,
      'unverändert; er ist über die Projektseite abrufbar.',
      '',
    )
  }
}

writeFileSync(join(root, 'public', 'licenses.txt'), `${lines.join('\n')}\n`)

if (missing.size > 0) {
  console.warn(
    `⚠ Nicht auflösbar (fehlt npm install?): ${[...missing].sort().join(', ')}`,
  )
}

const unlicensed = packages.filter((pkg) => !pkg.license)
if (unlicensed.length > 0) {
  console.warn(`⚠ Ohne Lizenzangabe: ${unlicensed.map((pkg) => pkg.name).join(', ')}`)
}

console.log(`✔ public/licenses.txt mit ${packages.length} Paketen erzeugt.`)
