import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style'
import type { GraphNodeKind, Safety } from '../data/types'

/**
 * Darstellung der Verbindungsbewertung. Die Bewertung wird dreifach kodiert –
 * über Farbe, Strichmuster *und* das Wort an der Linie –, damit sie nicht
 * allein von Farbe abhängt (WCAG 1.4.1 „Use of Color“). Die Erklärkarte zur
 * Karte zeigt alle drei.
 */
export interface SafetyAppearance {
  label: string
  /**
   * Kurzform für die Beschriftung in der Karte. Sie steht direkt auf der Linie,
   * damit man eine einzelne Verbindung lesen kann, ohne in die Erklärkarte zu
   * schauen – deshalb muss sie in eine Linienlänge passen.
   */
  shortLabel: string
  /**
   * Beispiel dafür, was die Bewertung in der Sache heißt. Steht in der Legende
   * unter der Bewertung und soll die Einordnung einer Verbindung erleichtern.
   * `unknown` hat keins – „noch nicht bewertet“ beschreibt keinen Weg.
   */
  example?: string
  color: string
  /** `undefined` = durchgezogen. */
  lineDash?: number[]
  width: number
}

export const SAFETY_APPEARANCE: Record<Safety, SafetyAppearance> = {
  safe: {
    label: 'Sicher',
    shortLabel: 'Sicher',
    example: 'durchgehender, separater Radweg',
    color: '#15803d',
    width: 6,
  },
  medium: {
    label: 'Mittel',
    shortLabel: 'Mittel',
    example: 'z. B. Nebenstraße',
    color: '#a1620a',
    lineDash: [16, 10],
    width: 6,
  },
  unsafe: {
    label: 'Unsicher',
    shortLabel: 'Unsicher',
    example: 'z. B. Kreisstraße oder Verbindung mit Gefahrenstellen',
    color: '#b91c1c',
    lineDash: [4, 4],
    width: 7,
  },
  unknown: {
    label: 'Noch nicht bewertet',
    // „Noch nicht bewertet“ wäre so breit, dass es von fast jeder Linie fiele.
    shortLabel: 'Unbewertet',
    color: '#64748b',
    width: 3,
  },
}

/**
 * Reihenfolge der Legendeneinträge. `unknown` fehlt bewusst: Die Legende
 * erklärt die Bewertungen, und „noch nicht bewertet“ ist keine. Die dünne
 * graue Linie bleibt auf der Karte und im Kanten-Popup, wo `SAFETY_APPEARANCE`
 * sie weiterhin beschreibt.
 */
export const SAFETY_ORDER: Safety[] = ['safe', 'medium', 'unsafe']

const NODE_COLOR = '#0f172a'
/** Straßenpunkte treten hinter die Orte zurück – sie sind selbst kein Ziel. */
const JUNCTION_COLOR = '#64748b'

/*
 * Die drei Kanten-Stile sind zwischengespeichert – wie `pinIcon` und
 * `clusterStyle` weiter unten und aus demselben Grund: OpenLayers ruft die
 * Stilfunktion pro Feature und Frame auf. Der Graph liegt in drei Ebenen über
 * derselben Quelle (Unterstrich, Linie, Beschriftung), macht bei 32
 * Verbindungen also rund 96 Aufrufe je Bild. Ein `Style` je Bewertung darf
 * dabei geteilt werden: OpenLayers liest die Stile nur, das Entzerren verändert
 * sie nicht.
 */
const edgeCasingCache = new Map<Safety, Style>()

/** Weißer Unterstrich, damit die Kanten auf jedem Kartenhintergrund lesbar bleiben. */
export function edgeCasingStyle(safety: Safety): Style {
  const cached = edgeCasingCache.get(safety)
  if (cached) return cached

  const style = new Style({
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.9)',
      width: SAFETY_APPEARANCE[safety].width + 5,
      lineCap: 'round',
    }),
  })
  edgeCasingCache.set(safety, style)
  return style
}

const edgeCache = new Map<string, Style>()

export function edgeStyle(safety: Safety, highlighted: boolean): Style {
  const key = `${safety}|${highlighted}`
  const cached = edgeCache.get(key)
  if (cached) return cached

  const appearance = SAFETY_APPEARANCE[safety]
  const style = new Style({
    stroke: new Stroke({
      color: appearance.color,
      width: appearance.width + (highlighted ? 3 : 0),
      lineDash: appearance.lineDash,
      lineCap: appearance.lineDash ? 'butt' : 'round',
    }),
  })
  edgeCache.set(key, style)
  return style
}

/**
 * Ab dieser Zoomstufe steht die Bewertung an der Linie. Gleiche Schwelle wie
 * die Ortsnamen in `graphNodeStyle`: darunter liegen die Ortsteile so dicht
 * beieinander, dass Beschriftungen nur noch übereinander lägen.
 */
const EDGE_LABEL_MIN_ZOOM = 12

const edgeLabelCache = new Map<Safety, Style>()

/**
 * Die Bewertung als Wort auf der Verbindung. Das ist der Kern der Lesbarkeit:
 * für eine einzelne Linie braucht man die Erklärkarte damit gar nicht mehr,
 * sie erklärt nur noch das Ganze. Der weiße Rand schneidet – wie bei
 * Straßennamen in Kartenwerken – eine Lücke in die Linie und hält den Text auf
 * jedem Kartenhintergrund lesbar.
 *
 * Gibt `undefined` zurück, solange die Karte zu weit herausgezoomt ist; dann
 * zeichnet OpenLayers nur den Strich.
 */
export function edgeLabelStyle(safety: Safety, zoom: number): Style | undefined {
  if (zoom < EDGE_LABEL_MIN_ZOOM) return undefined

  const cached = edgeLabelCache.get(safety)
  if (cached) return cached

  const appearance = SAFETY_APPEARANCE[safety]
  const style = new Style({
    text: new Text({
      text: appearance.shortLabel,
      // Der Text folgt der Linie statt daneben zu stehen – so ist die Zuordnung
      // eindeutig, auch wenn an einem Ort mehrere Verbindungen zusammenlaufen.
      placement: 'line',
      // Eine Stufe kleiner und leichter als die Ortsnamen (600 13px): der Ort
      // ist das Ziel, die Bewertung die Eigenschaft des Wegs dorthin.
      font: '600 12px system-ui, sans-serif',
      fill: new Fill({ color: appearance.color }),
      // Deckend weiß, nicht wie bei den Ortsnamen mit 0,95: „Mittel“ (#a1620a)
      // erreicht auf reinem Weiß 4,92:1 und damit knapp die 4,5:1 aus
      // WCAG 1.4.3 – ein durchscheinender Rand würde darunter rutschen.
      stroke: new Stroke({ color: '#ffffff', width: 4 }),
      // Standardwert, hier bewusst gesetzt: ist die Linie kürzer als das Wort,
      // bleibt sie unbeschriftet, statt dass der Text über die Enden hinausläuft.
      overflow: false,
    }),
  })
  edgeLabelCache.set(safety, style)
  return style
}

export function graphNodeStyle(name: string, zoom: number, kind: GraphNodeKind = 'place'): Style {
  // Ein Straßenpunkt (Abzweig, Kreisverkehr) ist kein Ort: er teilt eine
  // Verbindung nur auf und bekommt deshalb einen kleinen Punkt ohne
  // Beschriftung. Sein Name steht im Popup der angrenzenden Verbindungen.
  if (kind === 'junction') {
    return new Style({
      image: new Circle({
        radius: 3.5,
        fill: new Fill({ color: JUNCTION_COLOR }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
    })
  }

  return new Style({
    image: new Circle({
      radius: 6,
      fill: new Fill({ color: NODE_COLOR }),
      stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
    }),
    // Beschriftungen erst ab mittlerem Zoom, sonst überlagern sie sich.
    text:
      zoom >= 12
        ? new Text({
            text: name,
            font: '600 13px system-ui, sans-serif',
            offsetY: -18,
            fill: new Fill({ color: NODE_COLOR }),
            stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 4 }),
          })
        : undefined,
  })
}

const pinCache = new Map<string, Icon>()

/**
 * Kartenpin als SVG-Data-URI. Wird pro Farbe/Zustand einmal gebaut und danach
 * wiederverwendet – OpenLayers ruft die Stilfunktion pro Feature und Frame auf.
 */
function pinIcon(color: string, state: 'normal' | 'highlight' | 'selected'): Icon {
  const key = `${color}|${state}`
  const cached = pinCache.get(key)
  if (cached) return cached

  const halo = state === 'normal' ? '' : '<circle cx="16" cy="16" r="15" fill="rgba(15,23,42,0.18)"/>'
  const ring = state === 'selected' ? '#0f172a' : '#ffffff'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">${halo}<path d="M16 1.5c-7.2 0-13 5.8-13 13 0 9.4 11.1 24.6 12.1 25.9a1.1 1.1 0 0 0 1.8 0C17.9 39.1 29 23.9 29 14.5c0-7.2-5.8-13-13-13z" fill="${color}" stroke="${ring}" stroke-width="2.5"/><circle cx="16" cy="14.5" r="4.6" fill="#ffffff"/></svg>`

  const icon = new Icon({
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    anchor: [0.5, 1],
    scale: state === 'normal' ? 0.85 : 1.1,
  })
  pinCache.set(key, icon)
  return icon
}

export function itemStyle(color: string, state: 'normal' | 'highlight' | 'selected'): Style {
  return new Style({ image: pinIcon(color, state), zIndex: state === 'normal' ? 1 : 2 })
}

/** Farbe einer Blase, in der Vorschläge aus mehreren Ebenen zusammenfallen. */
export const MIXED_CLUSTER_COLOR = '#334155'

const clusterCache = new Map<string, Style>()

/**
 * Blase für zusammengefasste Pins. Der Radius wächst logarithmisch mit der
 * Anzahl, damit auch große Gruppen die Karte nicht zudecken. Die Zahl steht als
 * Text in der Blase – die Anzahl hängt also nicht an Größe oder Farbe allein.
 */
export function clusterStyle(
  count: number,
  color: string,
  state: 'normal' | 'highlight',
): Style {
  const key = `${count}|${color}|${state}`
  const cached = clusterCache.get(key)
  if (cached) return cached

  const radius = 15 + Math.min(9, Math.log2(count) * 3)
  const style = new Style({
    image: new Circle({
      radius: state === 'highlight' ? radius + 3 : radius,
      fill: new Fill({ color }),
      stroke: new Stroke({
        color: state === 'highlight' ? '#0f172a' : '#ffffff',
        width: 3,
      }),
    }),
    text: new Text({
      text: String(count),
      font: '700 14px system-ui, sans-serif',
      fill: new Fill({ color: '#ffffff' }),
    }),
    zIndex: state === 'highlight' ? 2 : 1,
  })
  clusterCache.set(key, style)
  return style
}
