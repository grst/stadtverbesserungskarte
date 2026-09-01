import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { itemById } from '../data/content'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import type { EdgeGeometryEnds } from '../map/mapController'
import { createMapController, type MapController } from '../map/mapController'
import { SAFETY_APPEARANCE } from '../map/styles'
import { SHEET_PEEK_PX } from '../layout'
import { useAppState } from '../state/AppState'
import { GraphLegend } from './GraphLegend'
import { Icon } from './Icon'

const RADVERKEHR_LAYER_ID = 'radverkehr'

export function MapView() {
  const mapElementRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<MapController | null>(null)
  const [ready, setReady] = useState(false)
  const [popupElement, setPopupElement] = useState<HTMLDivElement | null>(null)
  const [edgeInfo, setEdgeInfo] = useState<EdgeGeometryEnds | null>(null)

  const {
    visibleItems,
    activeLayerIds,
    hoveredItemId,
    setHoveredItemId,
    isLayerActive,
    registerMapApi,
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const detailMatch = useMatch('/vorschlag/:id')
  const selectedItemId = detailMatch?.params.id ?? null
  const reducedMotion = usePrefersReducedMotion()

  const graphVisible = isLayerActive(RADVERKEHR_LAYER_ID)

  // --- Karte einmalig aufbauen; sie überlebt jedes Rendern und jeden Routenwechsel
  // innerhalb der Kartenseite.
  useEffect(() => {
    const target = mapElementRef.current
    if (!target) return

    // Das Popup-Element wird hier erzeugt und nicht von React gerendert:
    // OpenLayers hängt das Element eines Overlays in seinen eigenen
    // Overlay-Container um. Wäre es ein React-Kind von `.mapview`, würde React
    // weiter davon ausgehen, dass es dort liegt, und beim Einblenden der
    // Legende mit „insertBefore: child to insert before is not a child of this
    // node“ abbrechen. Der Inhalt kommt stattdessen per Portal hinein – dessen
    // Kinder rührt OpenLayers nicht an.
    const element = document.createElement('div')
    element.className = 'map-popup'
    element.setAttribute('role', 'status')

    const controller = createMapController(target, element)
    controller.setBottomPadding(SHEET_PEEK_PX)

    // Nur im Entwicklungsserver: Zugriff auf die Karte für
    // scripts/check-map-interactions.mjs. Im Produktionsbuild fällt der Block weg.
    if (import.meta.env.DEV) {
      ;(window as unknown as { __olMap?: unknown }).__olMap = controller.map
    }
    controllerRef.current = controller
    setPopupElement(element)
    setReady(true)

    return () => {
      controllerRef.current = null
      setReady(false)
      setPopupElement(null)
      if (import.meta.env.DEV) {
        delete (window as unknown as { __olMap?: unknown }).__olMap
      }
      controller.dispose()
      element.remove()
    }
  }, [])

  // --- Callbacks bei jedem Render neu verdrahten (die Karte bleibt bestehen).
  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return

    controller.onItemActivate = (itemId) => {
      navigate({ pathname: `/vorschlag/${itemId}`, search: location.search })
    }
    controller.onItemHover = (itemId) => setHoveredItemId(itemId)
    controller.onEdgeActivate = (info) => setEdgeInfo(info)
  })

  // --- Sichtbare Einträge
  useEffect(() => {
    controllerRef.current?.setItems(visibleItems, activeLayerIds)
  }, [ready, visibleItems, activeLayerIds])

  // --- Hervorhebung (Explore-Panel-Hover, geöffneter Vorschlag)
  useEffect(() => {
    controllerRef.current?.setHighlight(hoveredItemId, selectedItemId)
  }, [ready, hoveredItemId, selectedItemId])

  // --- Bewegungen, die die Karte selbst auslöst (Blase aufklappen)
  useEffect(() => {
    controllerRef.current?.setAnimationsEnabled(!reducedMotion)
  }, [ready, reducedMotion])

  // --- Ortsteil-Graph nur zur Radverkehrs-Ebene
  useEffect(() => {
    controllerRef.current?.setGraphVisible(graphVisible)
    if (!graphVisible) setEdgeInfo(null)
  }, [ready, graphVisible])

  // --- Karte auf den geöffneten Vorschlag zentrieren (auch bei direktem Aufruf per URL)
  useEffect(() => {
    if (!selectedItemId) return
    const item = itemById.get(selectedItemId)
    if (item) controllerRef.current?.focusItem(item, !reducedMotion)
  }, [ready, selectedItemId, reducedMotion])

  // --- Karte für andere Komponenten fernsteuerbar machen
  useEffect(() => {
    if (!ready) return
    registerMapApi({
      focusItem: (item) => controllerRef.current?.focusItem(item, !reducedMotion),
      updateSize: () => controllerRef.current?.updateSize(),
    })
    return () => registerMapApi(null)
  }, [ready, reducedMotion, registerMapApi])

  // --- OpenLayers muss über jede Größenänderung des Containers informiert werden,
  // z. B. wenn auf dem Desktop das Detailpanel aufgeht.
  useEffect(() => {
    const target = mapElementRef.current
    if (!target) return
    const observer = new ResizeObserver(() => controllerRef.current?.updateSize())
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const appearance = edgeInfo ? SAFETY_APPEARANCE[edgeInfo.edge.safety] : null

  return (
    <div className="mapview">
      <div
        ref={mapElementRef}
        className="mapview-canvas"
        // tabIndex aktiviert die eingebauten Tastaturinteraktionen von
        // OpenLayers: Pfeiltasten verschieben, + und - zoomen.
        tabIndex={0}
        role="application"
        aria-label="Karte mit Verbesserungsvorschlägen. Verschieben mit den Pfeiltasten, Zoomen mit Plus und Minus. Dicht beieinander liegende Vorschläge sind zu Blasen mit ihrer Anzahl zusammengefasst und lassen sich durch Hineinzoomen auftrennen. Alle Vorschläge sind zusätzlich über die Listenansicht erreichbar."
      />

      {graphVisible && <GraphLegend />}

      {/* Popup für angeklickte Radverbindungen. OpenLayers positioniert das
          Element; sein Inhalt kommt per Portal aus React. */}
      {popupElement &&
        edgeInfo &&
        appearance &&
        createPortal(
          <>
            <button
              type="button"
              className="icon-button map-popup-close"
              onClick={() => {
                setEdgeInfo(null)
                controllerRef.current?.hidePopup()
              }}
            >
              <Icon name="close" size={18} />
              <span className="visually-hidden">Hinweis schließen</span>
            </button>
            <p className="map-popup-title">
              {edgeInfo.fromName} – {edgeInfo.toName}
            </p>
            <p className="map-popup-rating">
              <span
                className="legend-swatch"
                style={
                  {
                    '--swatch-color': appearance.color,
                    '--swatch-dash': appearance.lineDash ? `${appearance.lineDash[0]}px` : '999px',
                    '--swatch-gap': appearance.lineDash ? `${appearance.lineDash[1]}px` : '0px',
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
              Radverbindung: {appearance.label}
            </p>
            {edgeInfo.edge.note && <p className="map-popup-note">{edgeInfo.edge.note}</p>}
          </>,
          popupElement,
        )}
    </div>
  )
}
