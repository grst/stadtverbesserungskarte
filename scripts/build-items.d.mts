/**
 * Typen für scripts/build-items.mjs, damit die Kompilierung auch aus der
 * vite.config.ts heraus aufgerufen werden kann.
 */
export interface CompiledItems {
  /** Die Einträge, wie sie in data/items.json geschrieben werden. */
  items: Record<string, unknown>[]
  /** Inhalt der data/items.json inklusive Zeilenumbruch am Ende. */
  json: string
  /** Erzeugte Dateien, die sich tatsächlich geändert haben. */
  changed: string[]
  /** Ordner unter data/items/ ohne description.md. */
  skipped: string[]
}

export function buildItems(options?: { write?: boolean }): CompiledItems
