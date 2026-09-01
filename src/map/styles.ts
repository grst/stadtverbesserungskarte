import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style'
import type { Safety } from '../data/types'

/**
 * Darstellung der Verbindungsbewertung. Die Bewertung wird doppelt kodiert –
 * über Farbe *und* Strichmuster –, damit sie nicht allein von Farbe abhängt
 * (WCAG 1.4.1 „Use of Color“). Die Legende zeigt beides.
 */
export interface SafetyAppearance {
  label: string
  description: string
  color: string
  /** `undefined` = durchgezogen. */
  lineDash?: number[]
  width: number
}

export const SAFETY_APPEARANCE: Record<Safety, SafetyAppearance> = {
  safe: {
    label: 'Sicher',
    description: 'durchgezogene Linie',
    color: '#15803d',
    width: 6,
  },
  medium: {
    label: 'Mittel',
    description: 'gestrichelte Linie',
    color: '#a1620a',
    lineDash: [16, 10],
    width: 6,
  },
  unsafe: {
    label: 'Unsicher',
    description: 'gepunktete Linie',
    color: '#b91c1c',
    lineDash: [2, 8],
    width: 7,
  },
  unknown: {
    label: 'Noch nicht bewertet',
    description: 'dünne graue Linie',
    color: '#64748b',
    width: 3,
  },
}

/** Reihenfolge der Legendeneinträge. */
export const SAFETY_ORDER: Safety[] = ['safe', 'medium', 'unsafe', 'unknown']

const NODE_COLOR = '#0f172a'

/** Weißer Unterstrich, damit die Kanten auf jedem Kartenhintergrund lesbar bleiben. */
export function edgeCasingStyle(safety: Safety): Style {
  return new Style({
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.9)',
      width: SAFETY_APPEARANCE[safety].width + 5,
      lineCap: 'round',
    }),
  })
}

export function edgeStyle(safety: Safety, highlighted: boolean): Style {
  const appearance = SAFETY_APPEARANCE[safety]
  return new Style({
    stroke: new Stroke({
      color: appearance.color,
      width: appearance.width + (highlighted ? 3 : 0),
      lineDash: appearance.lineDash,
      lineCap: appearance.lineDash ? 'butt' : 'round',
    }),
  })
}

export function graphNodeStyle(name: string, zoom: number): Style {
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
