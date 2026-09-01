import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { allLayerIds, filterItemsByLayers, layerById } from '../data/content'
import type { Item, LayerId } from '../data/types'

/** Der Teil der Karte, den andere Komponenten fernsteuern dürfen. */
export interface MapApi {
  /** Karte auf einen Eintrag zentrieren. */
  focusItem: (item: Item) => void
  /** Nach Größenänderung des Kartencontainers aufrufen (OpenLayers braucht das). */
  updateSize: () => void
}

export type ViewMode = 'map' | 'list'

interface AppStateValue {
  activeLayerIds: LayerId[]
  isLayerActive: (layerId: LayerId) => boolean
  toggleLayer: (layerId: LayerId) => void
  visibleItems: Item[]
  /** Eintrag, über dem die Maus steht bzw. der im Explore-Panel fokussiert ist. */
  hoveredItemId: string | null
  setHoveredItemId: (itemId: string | null) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  registerMapApi: (api: MapApi | null) => void
  mapApi: MapApi | null
}

const AppStateContext = createContext<AppStateValue | null>(null)

const LAYER_PARAM = 'ebene'

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const mapApiRef = useRef<MapApi | null>(null)
  const [mapApi, setMapApi] = useState<MapApi | null>(null)

  // Ohne `?ebene=` sind alle Ebenen an, damit der erste Aufruf nicht auf einer
  // leeren Karte landet. Ein leerer Wert (`?ebene=`) bedeutet dagegen bewusst
  // „keine Ebene aktiv“.
  const rawParam = searchParams.get(LAYER_PARAM)
  const activeLayerIds = useMemo<LayerId[]>(() => {
    if (rawParam === null) return allLayerIds
    const requested = new Set(rawParam.split(',').filter(Boolean))
    return allLayerIds.filter((id) => requested.has(id))
  }, [rawParam])

  const isLayerActive = useCallback(
    (layerId: LayerId) => activeLayerIds.includes(layerId),
    [activeLayerIds],
  )

  const toggleLayer = useCallback(
    (layerId: LayerId) => {
      if (!layerById.has(layerId)) return
      const next = activeLayerIds.includes(layerId)
        ? activeLayerIds.filter((id) => id !== layerId)
        : allLayerIds.filter((id) => id === layerId || activeLayerIds.includes(id))

      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          params.set(LAYER_PARAM, next.join(','))
          return params
        },
        { replace: true },
      )
    },
    [activeLayerIds, setSearchParams],
  )

  const visibleItems = useMemo(() => filterItemsByLayers(activeLayerIds), [activeLayerIds])

  const registerMapApi = useCallback((api: MapApi | null) => {
    mapApiRef.current = api
    setMapApi(api)
  }, [])

  const value = useMemo<AppStateValue>(
    () => ({
      activeLayerIds,
      isLayerActive,
      toggleLayer,
      visibleItems,
      hoveredItemId,
      setHoveredItemId,
      viewMode,
      setViewMode,
      registerMapApi,
      mapApi,
    }),
    [
      activeLayerIds,
      isLayerActive,
      toggleLayer,
      visibleItems,
      hoveredItemId,
      viewMode,
      registerMapApi,
      mapApi,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState muss innerhalb von <AppStateProvider> verwendet werden.')
  return value
}
