#!/usr/bin/env node
/**
 * Nacharbeiten für GitHub Pages:
 *
 *  - `404.html` als Kopie von `index.html`, damit Deeplinks wie
 *    /vorschlag/<id> auch nach einem Reload bei der App landen (GitHub Pages
 *    kennt kein Rewrite auf index.html).
 *  - `.nojekyll`, damit Jekyll die Dateien nicht anfasst.
 */
import { copyFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
writeFileSync(resolve(dist, '.nojekyll'), '')

console.log('✔ 404.html und .nojekyll erzeugt.')
