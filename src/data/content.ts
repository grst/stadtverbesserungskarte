import itemsJson from '../../data/items.json'
import layersJson from '../../data/layers.json'
import graphJson from '../../data/ortsteile-graph.json'
import { itemImages } from './itemImages.generated'
import type { Item, Layer, LayerId, OrtsteileGraph, Safety } from './types'

export const layers = layersJson.layers as Layer[]
export const items = itemsJson as Item[]
export const graph = graphJson as OrtsteileGraph

export const layerById = new Map<LayerId, Layer>(layers.map((layer) => [layer.id, layer]))
export const itemById = new Map<string, Item>(items.map((item) => [item.id, item]))
export const graphNodeById = new Map(graph.nodes.map((node) => [node.id, node]))

/** Alle bekannten Ebenen-IDs in der Reihenfolge aus data/layers.json. */
export const allLayerIds: LayerId[] = layers.map((layer) => layer.id)

/**
 * Wie viele Verbindungen auf jede Bewertung fallen. Die Erklärkarte zur Karte
 * nennt diese Zahlen – so ist die Verteilung sofort ablesbar, ohne die Linien
 * zu zählen. Aus den Daten gerechnet, es gibt also nichts nachzupflegen.
 */
export const safetyCounts: Record<Safety, number> = graph.edges.reduce(
  (counts, edge) => {
    counts[edge.safety] += 1
    return counts
  },
  { safe: 0, medium: 0, unsafe: 0, unknown: 0 } as Record<Safety, number>,
)

/**
 * Ein Eintrag ist sichtbar, sobald *mindestens eine* seiner Ebenen aktiv ist –
 * ein Eintrag in mehreren Ebenen verschwindet also erst, wenn alle davon aus
 * sind.
 */
export function filterItemsByLayers(activeLayerIds: readonly LayerId[]): Item[] {
  const active = new Set(activeLayerIds)
  return items.filter((item) => item.layers.some((layerId) => active.has(layerId)))
}

/**
 * Baut aus einem auf public/ bezogenen Pfad eine URL, die auch unter einem
 * Unterpfad (GitHub Pages) funktioniert.
 */
function assetUrl(publicRelativePath: string): string {
  return `${import.meta.env.BASE_URL}${publicRelativePath.replace(/^\//, '')}`
}

/**
 * URL eines Vorschlagsbildes. In data/items.json stehen die Bilder als Pfade
 * relativ zum Projektverzeichnis (z. B. `data/items/<id>/before.jpg`); die
 * fertige URL kommt aus src/data/itemImages.generated.ts, wo jedes benutzte
 * Bild importiert und damit von Vite gebündelt wird.
 */
export function itemImageUrl(projectRelativePath: string): string {
  // Bilder aus dem Beschreibungstext können auch auf eine fremde Adresse
  // zeigen; die bleibt, wie sie ist.
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(projectRelativePath)) return projectRelativePath

  const bundled = itemImages[projectRelativePath.replace(/^\//, '')]
  if (bundled) return bundled

  // Kein Import vorhanden: das Bild kam nach dem letzten `npm run items` hinzu.
  if (import.meta.env.DEV) {
    console.warn(`Bild ohne Import: ${projectRelativePath} – "npm run items" ausführen.`)
  }
  return assetUrl(projectRelativePath)
}
