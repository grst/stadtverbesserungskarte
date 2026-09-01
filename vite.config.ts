import { sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildItems } from './scripts/build-items.mjs'

const itemsDir = fileURLToPath(new URL('data/items', import.meta.url))

/**
 * Kompiliert data/items.json (und die Bild-Importe) aus den Ordnern unter
 * data/items/ – beim Start und, im Dev-Server, nach jeder Änderung an einem
 * dieser Ordner. So genügt zum Pflegen der Inhalte das Speichern der
 * description.md; `npm run items` ist nur für einen Lauf ohne Vite nötig.
 */
function itemsPlugin(): Plugin {
  let isBuild = false

  const compile = () => {
    try {
      const { changed } = buildItems()
      if (changed.length > 0) console.log(`items: ${changed.join(', ')}`)
    } catch (error) {
      // Im Build ist ein fehlerhafter Ordner ein Abbruchgrund. Im Dev-Server
      // nur eine Meldung: das nächste Speichern der description.md korrigiert
      // sie, ohne den Server neu zu starten.
      if (isBuild) throw error
      console.error(`\n✖ ${(error as Error).message}\n`)
    }
  }

  return {
    name: 'stadtverbesserungskarte:items',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    buildStart() {
      compile()
    },
    configureServer(server) {
      server.watcher.add(itemsDir)
      // Mit Trennzeichen vergleichen: sonst gilt auch die erzeugte
      // data/items.json als Änderung an data/items/ und löst einen Lauf aus.
      server.watcher.on('all', (_event, path) => {
        if (path.startsWith(itemsDir + sep)) compile()
      })
    },
  }
}

// `VITE_BASE` lets the GitHub Pages workflow serve the site from a repository
// sub-path (e.g. `/stadtverbesserungskarte/`) without touching the source.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [itemsPlugin(), react()],
  build: {
    // OpenLayers is large; keep the warning threshold realistic instead of
    // splitting the map away from the shell that always needs it.
    chunkSizeWarningLimit: 800,
  },
})
