#!/usr/bin/env node
/**
 * Erzeugt Platzhalter-SVGs für alle Einträge in data/items.json, damit die App
 * ohne echte Fotos entwickelt werden kann. Geschrieben wird in den Ordner des
 * jeweiligen Vorschlags, also neben seine description.md.
 *
 * Aufruf: node scripts/make-placeholder-images.mjs
 *
 * Sobald ein echtes Foto vorliegt, die Datei in den Ordner des Vorschlags legen
 * und den Pfad in seiner description.md anpassen – dieses Skript überschreibt
 * nur SVGs, die zu einem Eintrag mit .svg-Pfad gehören.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const items = JSON.parse(readFileSync(resolve(root, 'data/items.json'), 'utf8'))

const W = 1600
const H = 1000

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Bricht einen Titel auf mehrere Zeilen um, grob nach Zeichenzahl. */
function wrap(text, max = 26) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && `${line} ${word}`.length > max) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

const variants = {
  before: {
    label: 'VORHER',
    sky: '#9aa5ad',
    ground: '#5d6469',
    surface: '#7c8489',
    accent: '#b9c0c5',
    badge: '#3f464b',
    // Grauer Asphaltstreifen, keine Bäume – bewusst karg.
    scene: `
      <rect x="0" y="620" width="${W}" height="380" fill="#6b7378"/>
      <rect x="0" y="700" width="${W}" height="24" fill="#8b9297"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${80 + i * 160}" y="756" width="90" height="10" fill="#c9ced1"/>`).join('')}
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${120 + i * 260}" y="470" width="150" height="150" fill="#868e93"/>`).join('')}
    `,
  },
  after: {
    label: 'NACHHER',
    sky: '#bfe0c8',
    ground: '#2f6b41',
    surface: '#4c8a5e',
    accent: '#e8f3ea',
    badge: '#1c6b3c',
    // Baumreihe, Radstreifen, Grünfläche – die vorgeschlagene Verbesserung.
    scene: `
      <rect x="0" y="620" width="${W}" height="380" fill="#5f6f63"/>
      <rect x="0" y="640" width="${W}" height="70" fill="#3f7f52"/>
      <rect x="0" y="700" width="${W}" height="8" fill="#eef7f0"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${80 + i * 160}" y="800" width="90" height="10" fill="#eef7f0"/>`).join('')}
      ${Array.from(
        { length: 6 },
        (_, i) => `
        <rect x="${186 + i * 260}" y="520" width="18" height="110" fill="#6b4b2f"/>
        <circle cx="${195 + i * 260}" cy="490" r="78" fill="#3d8b52"/>
        <circle cx="${152 + i * 260}" cy="520" r="54" fill="#4a9c60"/>
        <circle cx="${238 + i * 260}" cy="520" r="54" fill="#4a9c60"/>`,
      ).join('')}
    `,
  },
}

let written = 0
for (const item of items) {
  for (const [key, v] of Object.entries(variants)) {
    const rel = item.images?.[key]
    if (!rel || !rel.endsWith('.svg')) continue

    const titleLines = wrap(item.title)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escape(`Platzhalterbild ${v.label}: ${item.title}`)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${v.sky}"/>
      <stop offset="100%" stop-color="${v.surface}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${v.scene}
  <rect x="0" y="0" width="${W}" height="${H}" fill="${v.ground}" opacity="0.18"/>
  <g font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <rect x="64" y="64" width="${v.label.length * 34 + 64}" height="86" rx="10" fill="${v.badge}"/>
    <text x="${96}" y="124" font-size="56" font-weight="700" letter-spacing="4" fill="#ffffff">${v.label}</text>
    ${titleLines
      .map(
        (line, i) =>
          `<text x="64" y="${300 + i * 74}" font-size="62" font-weight="600" fill="${v.accent}" stroke="${v.badge}" stroke-width="8" paint-order="stroke">${escape(line)}</text>`,
      )
      .join('\n    ')}
    <text x="64" y="${H - 64}" font-size="38" fill="${v.accent}" stroke="${v.badge}" stroke-width="6" paint-order="stroke">Platzhalter – echtes Bild folgt</text>
  </g>
</svg>
`
    writeFileSync(resolve(root, rel), svg, 'utf8')
    written++
  }
}

console.log(`✔ ${written} Platzhalterbilder in data/items/<ordner>/ geschrieben.`)
