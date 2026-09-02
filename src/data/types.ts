/**
 * Typen der Inhaltsdateien unter data/.
 *
 * Die Dateien werden beim Build von scripts/validate-data.mjs gegen ihre JSON
 * Schemas geprüft. Die Typen hier spiegeln die Schemas, erzwingen sie aber
 * nicht – die Validierung ist die maßgebliche Instanz.
 */

/**
 * Ebenen-ID. Absichtlich `string` und keine Union: eine neue Ebene soll nur
 * data/layers.json und die Enum in data/items.schema.json betreffen, nicht den
 * TypeScript-Code.
 */
export type LayerId = string

export interface Layer {
  id: LayerId
  label: string
  /** Schlüssel in der Icon-Registry, siehe src/components/Icon.tsx. */
  icon: string
  /** Akzentfarbe der Ebene, für Chips und Kartenpins. */
  color: string
  description: string
}

export interface ItemImages {
  /** Pfad relativ zum Projektverzeichnis, siehe `itemImageUrl` in content.ts. */
  before: string
  after: string
  beforeAlt: string
  afterAlt: string
  /** Urheber- und Nutzungsangabe zu beiden Bildern. */
  copyright: string
}

export interface Item {
  /** Name des Ordners unter data/items/. */
  id: string
  title: string
  location: { lat: number; lon: number }
  layers: LayerId[]
  images: ItemImages
  /** Markdown – der Rumpf der description.md. */
  description: string
  author: string
}

/** Bewertung einer Radverbindung. `unknown` = noch nicht bewertet. */
export type Safety = 'safe' | 'medium' | 'unsafe' | 'unknown'

/**
 * `place` ist ein Ort, `junction` ein reiner Straßenpunkt (Abzweig,
 * Kreisverkehr), der eine Verbindung nur unterteilt. Fehlt das Feld, gilt
 * `place`.
 */
export type GraphNodeKind = 'place' | 'junction'

export interface GraphNode {
  id: string
  name: string
  kind?: GraphNodeKind
  lat: number
  lon: number
}

export interface GraphEdge {
  from: string
  to: string
  safety: Safety
  note?: string
}

export interface OrtsteileGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
