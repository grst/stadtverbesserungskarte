import Feature from 'ol/Feature'
import Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import View from 'ol/View'
import LineString from 'ol/geom/LineString'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorTileLayer from 'ol/layer/VectorTile'
import { fromLonLat } from 'ol/proj'
import Cluster from 'ol/source/Cluster'
import VectorSource from 'ol/source/Vector'
import { boundingExtent, getHeight, getWidth } from 'ol/extent'
import { defaults as defaultControls } from 'ol/control/defaults'
import { defaults as defaultInteractions } from 'ol/interaction/defaults'
import { applyBackground, applyStyle } from 'ol-mapbox-style'
import type { FeatureLike } from 'ol/Feature'
import type BaseLayer from 'ol/layer/Base'
import type { Coordinate } from 'ol/coordinate'
import { graph, graphNodeById, layerById } from '../data/content'
import type { GraphEdge, GraphNodeKind, Item, LayerId } from '../data/types'
import {
  MIXED_CLUSTER_COLOR,
  clusterStyle,
  edgeCasingStyle,
  edgeLabelStyle,
  edgeStyle,
  graphNodeStyle,
  itemStyle,
} from './styles'

/**
 * Vektor-Basiskarte von OpenFreeMap (Stil „Bright“): OpenStreetMap-Daten, kein
 * API-Schlüssel, keine Registrierung.
 *
 * Die Rasterkacheln von openstreetmap.org gibt es nur mit 256 px und ohne
 * Hidpi-Variante (`@2x` beantwortet der Server mit 400). Auf Telefonen mit
 * zwei- bis dreifacher Pixeldichte wurden sie entsprechend hochskaliert und
 * sahen matschig aus. Vektorkacheln rendert OpenLayers dagegen in der
 * Auflösung des Geräts.
 */
const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright'

/** Nur die Felder des MapLibre-Stils, die wir vor dem Anwenden anfassen. */
interface GlStyle {
  layers?: { layout?: { 'text-font'?: string[] } }[]
}

/** Startausschnitt: Immenstadt mit den nördlichen Ortsteilen. */
const INITIAL_CENTER: [number, number] = [10.205, 47.578]
const INITIAL_ZOOM = 12.2

const FALLBACK_PIN_COLOR = '#1c6b3c'

/**
 * Ab diesem Abstand (in Pixeln) werden Pins zu einer Blase mit Anzahl
 * zusammengefasst; `MIN_DISTANCE` hält die Blasen selbst auseinander.
 */
const CLUSTER_DISTANCE = 48
const CLUSTER_MIN_DISTANCE = 28

/** Zoomstufe, bis zu der das Aufklappen einer Blase höchstens hineinzoomt. */
const CLUSTER_EXPAND_MAX_ZOOM = 18
const CLUSTER_ANIMATION_MS = 400

/** Höhe eines Pins in Pixeln (32 × 44 px, hervorgehoben 1,1-fach skaliert). */
const PIN_HEIGHT_PX = 48

/**
 * Der Titel-Tooltip erscheint nur mit einem Zeigegerät, das schweben kann.
 * Auf einem Touchscreen löst ein Tippen ebenfalls `pointermove` aus – der
 * Tooltip würde danach stehen bleiben.
 */
const HOVER_CAPABLE = '(hover: hover) and (pointer: fine)'

interface EdgeGeometryEnds {
  edge: GraphEdge
  fromName: string
  toName: string
}

export interface MapController {
  readonly map: Map
  /** Sichtbare Einträge setzen; `activeLayerIds` bestimmt die Pinfarbe. */
  setItems(items: Item[], activeLayerIds: readonly LayerId[]): void
  setHighlight(hoveredItemId: string | null, selectedItemId: string | null): void
  setGraphVisible(visible: boolean): void
  /** Unterer Rand, der von der Karte freigehalten wird (Explore-Panel). */
  setBottomPadding(pixels: number): void
  /** Steuert Bewegungen, die die Karte selbst auslöst (z. B. Blase aufklappen). */
  setAnimationsEnabled(enabled: boolean): void
  focusItem(item: Item, animate: boolean): void
  updateSize(): void
  hidePopup(): void
  dispose(): void
  /** Wird von React bei jedem Render neu gesetzt – die Karte selbst bleibt bestehen. */
  onItemActivate: (itemId: string) => void
  onItemHover: (itemId: string | null) => void
  onEdgeActivate: (edge: EdgeGeometryEnds | null) => void
}

/**
 * `ol-mapbox-style` kann die PBF-Glyphen eines MapLibre-Stils nicht verwenden
 * und lädt Beschriftungsschriften stattdessen als Webfont nach – ungefragt
 * von cdn.jsdelivr.net. Das wäre ein weiterer Drittanbieter und eine
 * externe Schriftart, die die Datenschutzerklärung ausdrücklich ausschließt.
 *
 * Deshalb tauschen wir die Familie gegen das generische `sans-serif`; die
 * Bibliothek überspringt generische Familien beim Nachladen. Schnitt und
 * Stärke stehen im Namen und bleiben dabei erhalten („Noto Sans Bold“ wird zu
 * „sans-serif Bold“ und damit weiterhin fett gesetzt).
 */
function useSystemFonts(style: GlStyle): void {
  for (const layer of style.layers ?? []) {
    const layout = layer.layout
    const fonts = layout?.['text-font']
    if (!layout || !fonts) continue
    layout['text-font'] = fonts.map(systemFontStack)
  }
}

/** Schnitt- und Stärkeangaben, die am Ende eines Schriftnamens stehen können. */
const FONT_MODIFIERS = new Set([
  'thin', 'extralight', 'ultralight', 'light', 'book', 'regular', 'normal',
  'medium', 'semibold', 'demibold', 'bold', 'extrabold', 'black', 'heavy',
  'italic', 'oblique',
])

/** „Noto Sans Bold Italic“ → „sans-serif Bold Italic“. */
function systemFontStack(font: string): string {
  const words = font.split(' ')
  const modifiers: string[] = []
  while (words.length > 1 && FONT_MODIFIERS.has(words[words.length - 1].toLowerCase())) {
    modifiers.unshift(words.pop() as string)
  }
  return ['sans-serif', ...modifiers].join(' ')
}

async function applyBasemapStyle(layer: VectorTileLayer): Promise<void> {
  const response = await fetch(BASEMAP_STYLE_URL)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const style = (await response.json()) as GlStyle
  useSystemFonts(style)
  // `styleUrl` löst relative Angaben im Stil auf (Sprites, Quellen).
  await applyStyle(layer, style, { styleUrl: BASEMAP_STYLE_URL })
  // Die Hintergrundfarbe des Stils steckt in einer eigenen `background`-Ebene,
  // die `applyStyle` nicht kennt – ohne sie blitzt beim Nachladen der Kacheln
  // die weiße Seite durch.
  await applyBackground(layer, style)
}

export function createMapController(
  target: HTMLElement,
  popupElement: HTMLElement,
): MapController {
  const view = new View({
    center: fromLonLat(INITIAL_CENTER),
    zoom: INITIAL_ZOOM,
    minZoom: 10,
    maxZoom: 19,
  })

  const itemSource = new VectorSource<Feature<Point>>()
  const edgeSource = new VectorSource<Feature<LineString>>()
  const nodeSource = new VectorSource<Feature<Point>>()

  // Liegen Pins zu dicht beieinander, zeigt die Karte statt der Pins eine Blase
  // mit ihrer Anzahl. Beim Hineinzoomen fallen die Blasen wieder auseinander.
  const clusterSource = new Cluster({
    source: itemSource,
    distance: CLUSTER_DISTANCE,
    minDistance: CLUSTER_MIN_DISTANCE,
  })

  let hoveredItemId: string | null = null
  let selectedItemId: string | null = null
  let hoveredEdgeKey: string | null = null
  let animationsEnabled = true

  /** Die zusammengefassten Vorschläge einer Blase (auch bei nur einem Pin). */
  function clusterMembers(feature: FeatureLike): Feature<Point>[] {
    return (feature.get('features') as Feature<Point>[] | undefined) ?? []
  }

  const itemLayer = new VectorLayer({
    source: clusterSource,
    style: (feature) => {
      const members = clusterMembers(feature)
      if (members.length === 0) return undefined

      if (members.length === 1) {
        const id = members[0].get('itemId') as string
        const color = (members[0].get('color') as string) ?? FALLBACK_PIN_COLOR
        const state =
          id === selectedItemId ? 'selected' : id === hoveredItemId ? 'highlight' : 'normal'
        return itemStyle(color, state)
      }

      // Enthält die Blase den gerade geöffneten oder überfahrenen Vorschlag,
      // wird sie hervorgehoben – sonst wäre die Verbindung zum Explore-Panel weg.
      const containsHighlighted = members.some((member) => {
        const id = member.get('itemId') as string
        return id === hoveredItemId || id === selectedItemId
      })
      const colors = new Set(members.map((member) => member.get('color') as string))
      const color = colors.size === 1 ? [...colors][0] : MIXED_CLUSTER_COLOR
      return clusterStyle(members.length, color, containsHighlighted ? 'highlight' : 'normal')
    },
    // Pins immer über dem Graphen.
    zIndex: 30,
  })

  const edgeCasingLayer = new VectorLayer({
    source: edgeSource,
    style: (feature) => edgeCasingStyle(edgeOf(feature).safety),
    zIndex: 10,
  })

  const edgeLayer = new VectorLayer({
    source: edgeSource,
    style: (feature) => edgeStyle(edgeOf(feature).safety, feature.get('key') === hoveredEdgeKey),
    zIndex: 11,
  })

  // Die Beschriftung der Kanten liegt in einer eigenen Ebene über derselben
  // Quelle – wie schon Strich und Unterstrich. `declutter` wirkt auf Bilder und
  // Text; Strich und Text in einer Ebene zu mischen würde die Striche mit durch
  // den Declutter-Baum ziehen.
  const edgeLabelLayer = new VectorLayer({
    source: edgeSource,
    style: (feature, resolution) =>
      edgeLabelStyle(edgeOf(feature).safety, view.getZoomForResolution(resolution) ?? 0),
    zIndex: 12,
    // Derselbe Declutter-Wert wie bei den Ortsnamen: beide werden gemeinsam
    // entzerrt, sonst läge die Bewertung über einem Ortsnamen. Die Ortsnamen
    // liegen höher im Ebenenstapel und haben damit Vorrang – OpenLayers vergibt
    // die Declutter-Priorität nach Stapelreihenfolge.
    declutter: 'graph',
  })

  const nodeLayer = new VectorLayer({
    source: nodeSource,
    style: (feature, resolution) =>
      graphNodeStyle(
        feature.get('name') as string,
        view.getZoomForResolution(resolution) ?? 0,
        feature.get('nodeKind') as GraphNodeKind,
      ),
    zIndex: 13,
    declutter: 'graph',
  })

  const graphLayers = [edgeCasingLayer, edgeLayer, edgeLabelLayer, nodeLayer]
  for (const layer of graphLayers) layer.setVisible(false)

  const basemapLayer = new VectorTileLayer({
    // Der Basemap-Kontrast wird leicht gedämpft, damit Pins und Kanten
    // darüber gut lesbar bleiben.
    className: 'ol-layer basemap',
    // Eigener Entzerrungsraum: Die Beschriftungen der Basiskarte sollen mit den
    // Ortsnamen des Graphen nicht um dieselben Plätze streiten, sie liegen
    // ohnehin darunter.
    declutter: 'basemap',
  })
  // Der Stil kommt aus dem Netz; scheitert das, bleibt die Karte ohne
  // Hintergrund bedienbar – Pins, Graph und Explore-Panel hängen nicht daran.
  void applyBasemapStyle(basemapLayer).catch((error: unknown) => {
    console.warn('Basiskarte konnte nicht geladen werden.', error)
  })

  const popup = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    offset: [0, -12],
    autoPan: { animation: { duration: 200 } },
  })

  // Tooltip mit dem Titel des überfahrenen Pins. Anders als das Popup hat er
  // keinen React-Inhalt – deshalb baut der Controller sein Element selbst.
  const tooltipElement = document.createElement('div')
  tooltipElement.className = 'map-tooltip'
  // Rein visuelle Hilfe für die Maus: Tastatur und Screenreader bekommen die
  // Titel über das Explore-Panel und die Listenansicht.
  tooltipElement.setAttribute('aria-hidden', 'true')

  const tooltip = new Overlay({
    element: tooltipElement,
    positioning: 'bottom-center',
    // Über der Pinspitze, damit der Pin selbst frei bleibt.
    offset: [0, -PIN_HEIGHT_PX - 6],
    // Der Tooltip liegt außerhalb des Containers, der Events abfängt – er soll
    // Ziehen und Klicken auf der Karte nicht behindern.
    stopEvent: false,
    // OpenLayers legt das Element in einen eigenen Container. Ohne eigene
    // Klasse (Standard: `ol-overlay-container ol-selectable`) ließe sich dessen
    // `pointer-events` nicht abschalten – der Container würde Klicks über dem
    // Pin abfangen, obwohl der Tooltip selbst sie durchlässt.
    className: 'ol-overlay-container map-tooltip-container',
  })

  const hoverCapable = window.matchMedia(HOVER_CAPABLE)

  function hideTooltip(): void {
    tooltip.setPosition(undefined)
  }

  function showTooltip(title: string, coordinate: Coordinate): void {
    tooltipElement.textContent = title
    tooltip.setPosition(coordinate)
  }

  const map = new Map({
    target,
    view,
    layers: [
      basemapLayer,
      ...graphLayers,
      itemLayer,
    ],
    overlays: [popup, tooltip],
    // OpenLayers legt seine Standardinteraktionen mit `onFocusOnly: true` an.
    // Sobald das Zielelement ein `tabindex` hat – und das braucht es für die
    // Tastaturbedienung – reagieren Mausrad und Ziehen dann erst, wenn der Fokus
    // in der Karte liegt: man müsste die Karte erst anklicken. Also explizit
    // ohne Fokusbindung. Die Tastaturinteraktionen bleiben davon unberührt,
    // sie hängen ohnehin am Fokus des Zielelements.
    interactions: defaultInteractions({ onFocusOnly: false }),
    controls: defaultControls({
      rotate: false,
      // Die eingebauten Beschriftungen von OpenLayers sind englisch.
      zoomOptions: {
        zoomInTipLabel: 'Hineinzoomen',
        zoomOutTipLabel: 'Herauszoomen',
      },
      attributionOptions: {
        collapsible: false,
        tipLabel: 'Urheberrechtsangaben',
      },
    }),
  })

  const viewport = map.getViewport()

  // ------------------------------------------------------------- Graphaufbau
  for (const node of graph.nodes) {
    const feature = new Feature({ geometry: new Point(fromLonLat([node.lon, node.lat])) })
    feature.set('kind', 'node')
    feature.set('name', node.name)
    feature.set('nodeId', node.id)
    feature.set('nodeKind', node.kind ?? 'place')
    nodeSource.addFeature(feature)
  }

  for (const edge of graph.edges) {
    const from = graphNodeById.get(edge.from)
    const to = graphNodeById.get(edge.to)
    // Ungültige Kanten fängt scripts/validate-data.mjs ab; zur Sicherheit hier
    // still überspringen, statt die Karte scheitern zu lassen.
    if (!from || !to) continue
    const feature = new Feature({
      geometry: new LineString([
        fromLonLat([from.lon, from.lat]),
        fromLonLat([to.lon, to.lat]),
      ]),
    })
    feature.set('kind', 'edge')
    feature.set('key', `${edge.from}|${edge.to}`)
    feature.set('edge', edge)
    feature.set('fromName', from.name)
    feature.set('toName', to.name)
    edgeSource.addFeature(feature)
  }

  function edgeOf(feature: FeatureLike): GraphEdge {
    return feature.get('edge') as GraphEdge
  }

  /**
   * Ebenen, in denen die Treffersuche überhaupt sucht – ausdrücklich als
   * Positivliste. Der weiße Unterstrich und die Beschriftung zeigen dieselben
   * Kanten wie `edgeLayer`; würden sie mitgesucht, hinge es an der Trefferfolge
   * von OpenLayers, welche Ebene antwortet, und der Vorrang der Pins vor den
   * Verbindungen wäre nicht mehr eindeutig.
   */
  function hitLayer(layer: BaseLayer): boolean {
    return layer === itemLayer || layer === edgeLayer
  }

  /**
   * Eine angeklickte Blase aufklappen: so weit hineinzoomen, dass die
   * enthaltenen Vorschläge nebeneinander liegen. Liegen sie auf demselben Punkt,
   * bleibt nur der Zoomschritt – dann trennt sie erst der letzte Zoom.
   */
  function expandCluster(members: Feature<Point>[]): void {
    const coordinates = members
      .map((member) => member.getGeometry()?.getCoordinates())
      .filter((coordinate): coordinate is Coordinate => Boolean(coordinate))
    if (coordinates.length === 0) return

    const duration = animationsEnabled ? CLUSTER_ANIMATION_MS : undefined
    const extent = boundingExtent(coordinates)

    if (getWidth(extent) < 1 && getHeight(extent) < 1) {
      const zoom = Math.min((view.getZoom() ?? INITIAL_ZOOM) + 2, view.getMaxZoom())
      if (duration === undefined) {
        view.setCenter(coordinates[0])
        view.setZoom(zoom)
      } else {
        view.animate({ center: coordinates[0], zoom, duration })
      }
      return
    }

    // `view.fit` berücksichtigt `view.padding` (Explore-Panel) selbst; die
    // zusätzlichen 48 px halten die Pins von den Rändern frei.
    view.fit(extent, {
      padding: [48, 48, 48, 48],
      maxZoom: CLUSTER_EXPAND_MAX_ZOOM,
      duration,
    })
  }

  // ------------------------------------------------------------- Interaktion
  const controller: MapController = {
    map,
    onItemActivate: () => {},
    onItemHover: () => {},
    onEdgeActivate: () => {},

    setItems(items, activeLayerIds) {
      const active = new Set(activeLayerIds)
      itemSource.clear()
      for (const item of items) {
        // Farbe der ersten aktiven Ebene des Eintrags – so wechselt ein Eintrag
        // in mehreren Ebenen die Farbe passend zur Auswahl.
        const layerId = item.layers.find((id) => active.has(id)) ?? item.layers[0]
        const feature = new Feature({
          geometry: new Point(fromLonLat([item.location.lon, item.location.lat])),
        })
        feature.set('kind', 'item')
        feature.set('itemId', item.id)
        feature.set('title', item.title)
        feature.set('color', layerById.get(layerId)?.color ?? FALLBACK_PIN_COLOR)
        itemSource.addFeature(feature)
      }
    },

    setHighlight(nextHovered, nextSelected) {
      if (nextHovered === hoveredItemId && nextSelected === selectedItemId) return
      hoveredItemId = nextHovered
      selectedItemId = nextSelected
      itemLayer.changed()
    },

    setGraphVisible(visible) {
      for (const layer of graphLayers) layer.setVisible(visible)
      if (!visible) controller.hidePopup()
    },

    setBottomPadding(pixels) {
      view.padding = [0, 0, pixels, 0]
    },

    setAnimationsEnabled(enabled) {
      animationsEnabled = enabled
    },

    focusItem(item, animate) {
      const center = fromLonLat([item.location.lon, item.location.lat]) as Coordinate
      const zoom = Math.max(view.getZoom() ?? INITIAL_ZOOM, 16)
      if (animate) {
        view.animate({ center, zoom, duration: 500 })
      } else {
        view.setCenter(center)
        view.setZoom(zoom)
      }
    },

    updateSize() {
      map.updateSize()
    },

    hidePopup() {
      popup.setPosition(undefined)
    },

    dispose() {
      viewport.removeEventListener('pointerleave', hideTooltip)
      tooltipElement.remove()
      map.setTarget(undefined)
      map.dispose()
    },
  }

  map.on('click', (event) => {
    // Erst alles unter dem Zeiger einsammeln, dann entscheiden: Pins haben
    // Vorrang vor Radverbindungen. OpenLayers liefert die Treffer nicht in der
    // Reihenfolge der Ebenen – am Fuß eines Pins, der auf einer Kante steht,
    // käme sonst das Popup der Verbindung statt des Vorschlags.
    let pinMembers: Feature<Point>[] | null = null
    let hitEdge: EdgeGeometryEnds | null = null

    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const members = clusterMembers(feature)
        if (members.length > 0) {
          pinMembers = members
          return true
        }
        if (feature.get('kind') === 'edge' && !hitEdge) {
          hitEdge = {
            edge: edgeOf(feature),
            fromName: feature.get('fromName') as string,
            toName: feature.get('toName') as string,
          }
        }
        return false
      },
      { hitTolerance: 8, layerFilter: hitLayer },
    )

    if (pinMembers) {
      const members: Feature<Point>[] = pinMembers
      controller.onEdgeActivate(null)
      controller.hidePopup()
      // Ein einzelner Pin öffnet den Vorschlag, eine Blase klappt auf.
      if (members.length === 1) {
        controller.onItemActivate(members[0].get('itemId') as string)
      } else {
        expandCluster(members)
      }
      return
    }

    if (hitEdge) {
      controller.onEdgeActivate(hitEdge)
      popup.setPosition(event.coordinate)
      return
    }

    controller.onEdgeActivate(null)
    controller.hidePopup()
  })

  map.on('pointermove', (event) => {
    if (event.dragging) return
    let itemId: string | null = null
    let itemTitle: string | null = null
    /** Position des *gezeichneten* Pins – bei Blasen weicht sie vom Punkt ab. */
    let itemCoordinate: Coordinate | null = null
    let edgeKey: string | null = null
    let overCluster = false
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const members = clusterMembers(feature)
        if (members.length === 1 && !itemId) {
          itemId = members[0].get('itemId') as string
          itemTitle = members[0].get('title') as string
          const geometry = feature.getGeometry()
          itemCoordinate = geometry instanceof Point ? geometry.getCoordinates() : null
        } else if (members.length > 1) {
          // Über einer Blase wird kein einzelner Vorschlag hervorgehoben.
          overCluster = true
        }
        if (feature.get('kind') === 'edge' && !edgeKey) edgeKey = feature.get('key') as string
        return false
      },
      { hitTolerance: 8, layerFilter: hitLayer },
    )

    const targetElement = map.getTargetElement()
    if (targetElement) {
      targetElement.style.cursor = itemId || edgeKey || overCluster ? 'pointer' : ''
    }
    if (edgeKey !== hoveredEdgeKey) {
      hoveredEdgeKey = edgeKey
      edgeLayer.changed()
    }
    if (itemTitle && itemCoordinate && hoverCapable.matches) {
      showTooltip(itemTitle, itemCoordinate)
    } else {
      hideTooltip()
    }
    controller.onItemHover(itemId)
  })

  // Verlässt der Zeiger die Karte, bleibt sonst der letzte Tooltip stehen.
  viewport.addEventListener('pointerleave', hideTooltip)
  // Beim Verschieben und Zoomen wandern die Pins unter dem Zeiger weg; der
  // nächste `pointermove` zeigt den Tooltip gegebenenfalls wieder an.
  map.on('movestart', hideTooltip)

  return controller
}

export type { EdgeGeometryEnds }
