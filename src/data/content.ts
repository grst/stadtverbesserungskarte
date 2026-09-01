import itemsJson from '../../data/items.json'
import layersJson from '../../data/layers.json'
import graphJson from '../../data/ortsteile-graph.json'
import type { Item, Layer, LayerId, OrtsteileGraph } from './types'

export const layers = layersJson.layers as Layer[]
export const items = itemsJson as Item[]
export const graph = graphJson as OrtsteileGraph

export const layerById = new Map<LayerId, Layer>(layers.map((layer) => [layer.id, layer]))
export const itemById = new Map<string, Item>(items.map((item) => [item.id, item]))
export const graphNodeById = new Map(graph.nodes.map((node) => [node.id, node]))

/** Alle bekannten Ebenen-IDs in der Reihenfolge aus data/layers.json. */
export const allLayerIds: LayerId[] = layers.map((layer) => layer.id)

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
 * Baut aus einem in data/ hinterlegten, auf public/ bezogenen Pfad eine URL,
 * die auch unter einem Unterpfad (GitHub Pages) funktioniert.
 */
export function assetUrl(publicRelativePath: string): string {
  return `${import.meta.env.BASE_URL}${publicRelativePath.replace(/^\//, '')}`
}
