import Feature from 'ol/Feature'
import Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import View from 'ol/View'
import LineString from 'ol/geom/LineString'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { fromLonLat } from 'ol/proj'
import OSM from 'ol/source/OSM'
import Cluster from 'ol/source/Cluster'
import VectorSource from 'ol/source/Vector'
import { boundingExtent, getHeight, getWidth } from 'ol/extent'
import { defaults as defaultControls } from 'ol/control/defaults'
import { defaults as defaultInteractions } from 'ol/interaction/defaults'
import type { FeatureLike } from 'ol/Feature'
import type { Coordinate } from 'ol/coordinate'
import { graph, graphNodeById, layerById } from '../data/content'
import type { GraphEdge, Item, LayerId } from '../data/types'
import {
  MIXED_CLUSTER_COLOR,
  clusterStyle,
  edgeCasingStyle,
  edgeStyle,
  graphNodeStyle,
  itemStyle,
} from './styles'

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

  const nodeLayer = new VectorLayer({
    source: nodeSource,
    style: (feature, resolution) =>
      graphNodeStyle(feature.get('name') as string, view.getZoomForResolution(resolution) ?? 0),
    zIndex: 12,
    declutter: true,
  })

  const graphLayers = [edgeCasingLayer, edgeLayer, nodeLayer]
  for (const layer of graphLayers) layer.setVisible(false)

  const popup = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    offset: [0, -12],
    autoPan: { animation: { duration: 200 } },
  })

  const map = new Map({
    target,
    view,
    layers: [
      new TileLayer({
        source: new OSM(),
        // Der Basemap-Kontrast wird leicht gedämpft, damit Pins und Kanten
        // darüber gut lesbar bleiben.
        className: 'ol-layer basemap',
      }),
      ...graphLayers,
      itemLayer,
    ],
    overlays: [popup],
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

  // ------------------------------------------------------------- Graphaufbau
  for (const node of graph.nodes) {
    const feature = new Feature({ geometry: new Point(fromLonLat([node.lon, node.lat])) })
    feature.set('kind', 'node')
    feature.set('name', node.name)
    feature.set('nodeId', node.id)
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
      map.setTarget(undefined)
      map.dispose()
    },
  }

  map.on('click', (event) => {
    let handled = false
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        if (handled) return true
        const members = clusterMembers(feature)
        if (members.length > 0) {
          handled = true
          controller.hidePopup()
          // Ein einzelner Pin öffnet den Vorschlag, eine Blase klappt auf.
          if (members.length === 1) {
            controller.onItemActivate(members[0].get('itemId') as string)
          } else {
            expandCluster(members)
          }
          return true
        }
        const kind = feature.get('kind')
        if (kind === 'edge') {
          handled = true
          controller.onEdgeActivate({
            edge: edgeOf(feature),
            fromName: feature.get('fromName') as string,
            toName: feature.get('toName') as string,
          })
          popup.setPosition(event.coordinate)
          return true
        }
        return false
      },
      { hitTolerance: 8, layerFilter: (layer) => layer !== edgeCasingLayer },
    )

    if (!handled) {
      controller.onEdgeActivate(null)
      controller.hidePopup()
    }
  })

  map.on('pointermove', (event) => {
    if (event.dragging) return
    let itemId: string | null = null
    let edgeKey: string | null = null
    let overCluster = false
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const members = clusterMembers(feature)
        if (members.length === 1 && !itemId) {
          itemId = members[0].get('itemId') as string
        } else if (members.length > 1) {
          // Über einer Blase wird kein einzelner Vorschlag hervorgehoben.
          overCluster = true
        }
        if (feature.get('kind') === 'edge' && !edgeKey) edgeKey = feature.get('key') as string
        return false
      },
      { hitTolerance: 8, layerFilter: (layer) => layer !== edgeCasingLayer },
    )

    const targetElement = map.getTargetElement()
    if (targetElement) {
      targetElement.style.cursor = itemId || edgeKey || overCluster ? 'pointer' : ''
    }
    if (edgeKey !== hoveredEdgeKey) {
      hoveredEdgeKey = edgeKey
      edgeLayer.changed()
    }
    controller.onItemHover(itemId)
  })

  return controller
}

export type { EdgeGeometryEnds }
