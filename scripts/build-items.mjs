#!/usr/bin/env node
/**
 * Kompiliert `data/items.json` aus den Ordnern unter `data/items/`.
 *
 * Ein Vorschlag ist ein Ordner mit einer `description.md`:
 *
 *   data/items/<ordner>/description.md   YAML-Frontmatter + Beschreibung
 *   data/items/<ordner>/before.jpg       Bilder, im Frontmatter relativ
 *   data/items/<ordner>/after.jpg        zur description.md angegeben
 *
 * Der Ordnername ist die `id` des Vorschlags (und damit Teil der Adresse
 * `/vorschlag/<id>`), das Frontmatter liefert alle übrigen Felder und der
 * Rumpf der Datei die Beschreibung als Markdown.
 *
 * Erzeugt zwei Dateien – beide sind generiert und werden nicht bearbeitet:
 *
 *   data/items.json                   Bildpfade repo-relativ aufgelöst,
 *                                     wird gegen data/items.schema.json geprüft
 *   src/data/itemImages.generated.ts  je ein Import pro benutztem Bild, damit
 *                                     Vite genau diese Bilder bündelt
 *
 * Aufruf: `npm run items` (läuft auch vor `npm run dev` und `npm run build`;
 * der Vite-Dev-Server ruft die Kompilierung bei jeder Änderung erneut auf).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, posix, relative, resolve, sep } from 'node:path'
import YAML from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ITEMS_DIR = 'data/items'
const ITEMS_JSON = 'data/items.json'
const IMAGES_MODULE = 'src/data/itemImages.generated.ts'

/** Reihenfolge der Felder in der erzeugten items.json – rein kosmetisch. */
const ITEM_KEYS = ['id', 'title', 'location', 'layers', 'images', 'description', 'author']
const IMAGE_KEYS = ['before', 'after', 'beforeAlt', 'afterAlt', 'copyright']

/** Felder des Frontmatters, die auf einen Bildpfad zeigen. */
const IMAGE_PATH_KEYS = ['before', 'after']

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * Markdown-Bild: `![alt](pfad "titel")`, auch in der Form `![alt](<pfad>)`.
 *
 * Bewusst ein Suchmuster statt eines Markdown-Parsers: die Beschreibung soll
 * unverändert in items.json landen, nur die Bildpfade werden ersetzt. Ein Bild
 * in einem Codeblock würde deshalb ebenfalls ersetzt – ein Beispiel im Text
 * braucht also einen Pfad, der wirklich existiert (oder eine fremde Adresse).
 */
const MARKDOWN_IMAGE = /(!\[[^\]]*\])\([ \t]*<?([^)>\s]+)>?((?:[ \t]+(?:"[^"]*"|'[^']*'))?)[ \t]*\)/g

/** Absolute URLs, absolute Pfade und Data-URLs bleiben unangetastet. */
const isRelativePath = (value) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)

/** Sortiert die bekannten Felder nach vorn, unbekannte bleiben hinten stehen. */
function orderKeys(object, keys) {
  const known = keys.filter((key) => key in object)
  const rest = Object.keys(object).filter((key) => !keys.includes(key))
  return Object.fromEntries([...known, ...rest].map((key) => [key, object[key]]))
}

/**
 * Liest alle Vorschlagsordner ein.
 *
 * @returns {{ items: object[], images: string[], skipped: string[], errors: string[] }}
 *   `images` sind alle benutzten Bilder als repo-relative Pfade, `skipped` die
 *   Ordner ohne description.md (z. B. Material, das noch nicht fertig ist).
 */
function compileItems() {
  const itemsDir = resolve(root, ITEMS_DIR)
  const errors = []
  const skipped = []
  const items = []
  const images = new Set()

  if (!existsSync(itemsDir)) {
    return { items, images: [], skipped, errors: [`${ITEMS_DIR}/ fehlt`] }
  }

  const folders = readdirSync(itemsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'))

  for (const folder of folders) {
    const mdPath = resolve(itemsDir, folder, 'description.md')
    const where = `${ITEMS_DIR}/${folder}/description.md`
    const fail = (message) => errors.push(`${where}: ${message}`)

    if (!existsSync(mdPath)) {
      skipped.push(folder)
      continue
    }

    const raw = readFileSync(mdPath, 'utf8')
    const match = FRONTMATTER.exec(raw)
    if (!match) {
      fail('kein YAML-Frontmatter gefunden (die Datei muss mit einer Zeile "---" beginnen)')
      continue
    }

    let meta
    try {
      meta = YAML.parse(match[1])
    } catch (error) {
      fail(`Frontmatter ist kein gültiges YAML: ${error.message}`)
      continue
    }
    if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) {
      fail('Frontmatter muss eine Liste von Feldern sein (z. B. "title: …")')
      continue
    }

    for (const reserved of ['id', 'description']) {
      if (reserved in meta) {
        fail(
          reserved === 'id'
            ? 'das Feld "id" gehört nicht ins Frontmatter – die id ist der Ordnername'
            : 'das Feld "description" gehört nicht ins Frontmatter – die Beschreibung ist der Rumpf der Datei',
        )
      }
    }

    const body = raw.slice(match[0].length).trim()
    if (!body) fail('unter dem Frontmatter fehlt die Beschreibung')

    /** Löst einen im Frontmatter oder im Text angegebenen Bildpfad auf. */
    const resolveImage = (value, field) => {
      const target = resolve(itemsDir, folder, value)
      const rel = relative(root, target).split(sep).join(posix.sep)
      if (!rel.startsWith(`${ITEMS_DIR}/${folder}/`)) {
        fail(`${field}: "${value}" liegt außerhalb des Ordners`)
        return rel
      }
      if (!existsSync(target)) {
        fail(`${field}: Bilddatei fehlt: ${rel}`)
        return rel
      }
      images.add(rel)
      return rel
    }

    const hasImages =
      typeof meta.images === 'object' && meta.images !== null && !Array.isArray(meta.images)
    const metaImages = hasImages ? { ...meta.images } : {}

    if (!hasImages) {
      fail('das Feld "images" fehlt oder ist keine Liste von Feldern')
    } else {
      for (const key of IMAGE_PATH_KEYS) {
        const value = metaImages[key]
        if (typeof value !== 'string' || !value.trim()) {
          fail(`images.${key} fehlt (Pfad relativ zur description.md, z. B. "${key}.jpg")`)
          continue
        }
        if (!isRelativePath(value)) {
          fail(`images.${key}: "${value}" muss ein Pfad relativ zur description.md sein`)
          continue
        }
        metaImages[key] = resolveImage(value, `images.${key}`)
      }
    }

    // Bilder im Beschreibungstext auf denselben repo-relativen Pfad umschreiben,
    // damit die App sie genauso auflösen kann wie Vorher- und Nachher-Bild.
    const description = body.replace(MARKDOWN_IMAGE, (all, alt, href, title) => {
      if (!isRelativePath(href)) return all
      return `${alt}(${resolveImage(decodeURI(href), `Bild im Text "${href}"`)}${title})`
    })

    items.push(
      orderKeys(
        { ...meta, id: folder, images: orderKeys(metaImages, IMAGE_KEYS), description },
        ITEM_KEYS,
      ),
    )
  }

  return { items, images: [...images].sort(), skipped, errors }
}

/** Erzeugt den Inhalt von src/data/itemImages.generated.ts. */
function imagesModuleSource(images) {
  const moduleDir = dirname(resolve(root, IMAGES_MODULE))
  const imports = images
    .map((path, index) => {
      const from = relative(moduleDir, resolve(root, path)).split(sep).join(posix.sep)
      return `import img${index} from '${from}'`
    })
    .join('\n')
  const entries = images.map((path, index) => `  '${path}': img${index},`).join('\n')

  return `// Automatisch erzeugt von scripts/build-items.mjs – nicht bearbeiten.
//
// Jedes in data/items/<ordner>/description.md benutzte Bild wird hier einzeln
// importiert. So übernimmt Vite genau diese Bilder (mit Hash im Dateinamen) in
// den Build – und nicht den Rest der Ordner, in denen auch Originalfotos und
// Zwischenstände liegen.
${imports ? `${imports}\n` : ''}
/** Repo-relativer Pfad aus data/items.json → gebündelte URL des Bildes. */
export const itemImages: Record<string, string> = {${entries ? `\n${entries}\n` : ''}}
`
}

/** Schreibt nur bei echter Änderung – sonst löst jeder Aufruf einen Reload aus. */
function writeIfChanged(relPath, content) {
  const target = resolve(root, relPath)
  if (existsSync(target) && readFileSync(target, 'utf8') === content) return false
  writeFileSync(target, content, 'utf8')
  return true
}

/**
 * Kompiliert die Ordner und schreibt die erzeugten Dateien.
 *
 * @param {{ write?: boolean }} [options] `write: false` erzeugt den Inhalt nur
 *   im Speicher – so prüft scripts/validate-data.mjs, ob die Dateien aktuell sind.
 * @returns {{ items: object[], json: string, changed: string[], skipped: string[] }}
 * @throws {Error} wenn ein Ordner fehlerhaft ist; die Meldung listet alle Probleme.
 */
export function buildItems({ write = true } = {}) {
  const { items, images, skipped, errors } = compileItems()
  if (errors.length > 0) {
    throw new Error(
      `${errors.length} Problem(e) in ${ITEMS_DIR}/:\n${errors.map((e) => `  • ${e}`).join('\n')}`,
    )
  }

  const json = `${JSON.stringify(items, null, 2)}\n`
  const changed = []
  if (write) {
    if (writeIfChanged(ITEMS_JSON, json)) changed.push(ITEMS_JSON)
    if (writeIfChanged(IMAGES_MODULE, imagesModuleSource(images))) changed.push(IMAGES_MODULE)
  }

  return { items, json, changed, skipped }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { items, changed, skipped } = buildItems()
    if (skipped.length > 0) {
      console.log(
        `ℹ ${skipped.length} Ordner ohne description.md übersprungen: ${skipped.join(', ')}`,
      )
    }
    console.log(
      `✔ ${ITEMS_JSON}: ${items.length} Vorschläge aus ${ITEMS_DIR}/ kompiliert` +
        (changed.length > 0 ? ` (aktualisiert: ${changed.join(', ')})` : ' (unverändert)'),
    )
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`)
    process.exit(1)
  }
}
