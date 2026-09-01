import { useEffect, useState } from 'react'
import { Outlet, useMatch } from 'react-router'
import { ExploreSheet } from '../components/ExploreSheet'
import { ItemListView } from '../components/ItemListView'
import { LayerChips } from '../components/LayerChips'
import { MapView } from '../components/MapView'
import { useAppState } from '../state/AppState'

export function MapPage() {
  // Das Explore-Panel braucht die Höhe der Kartenfläche, um seine Stufen zu
  // berechnen – dadurch bleibt es innerhalb der Karte und deckt nie den Footer ab.
  const [sectionElement, setSectionElement] = useState<HTMLElement | null>(null)
  const { viewMode } = useAppState()
  // Solange ein Vorschlag offen ist, liefert dessen Detailansicht die H1.
  const detailOpen = Boolean(useMatch('/vorschlag/:id'))

  useEffect(() => {
    document.title = 'Stadtverbesserungskarte Immenstadt i. Allgäu'
  }, [])

  return (
    <>
      <LayerChips />
      <main id="main" className="map-main">
        {!detailOpen && (
          <h1 className="visually-hidden">
            Stadtverbesserungskarte Immenstadt i. Allgäu – Karte der Verbesserungsvorschläge
          </h1>
        )}

        {/* Die Karte bleibt beim Wechsel zur Liste im DOM (nur ausgeblendet),
            damit Ausschnitt und Zoomstufe erhalten bleiben. */}
        <section
          ref={setSectionElement}
          className={viewMode === 'map' ? 'map-section' : 'map-section is-hidden'}
        >
          <MapView />
          <ExploreSheet container={sectionElement} />
        </section>

        {viewMode === 'list' && <ItemListView />}

        <Outlet />
      </main>
    </>
  )
}
