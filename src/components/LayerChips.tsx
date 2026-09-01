import { layers } from '../data/content'
import { useAppState } from '../state/AppState'
import { Icon } from './Icon'

export function LayerChips() {
  const { isLayerActive, toggleLayer, visibleItems, viewMode, setViewMode } = useAppState()

  return (
    // Eigenes Landmark, damit die Filterleiste zwischen Kopfzeile und Karte
    // nicht außerhalb aller Regionen liegt.
    <section className="chipbar" aria-label="Ebenen und Ansicht">
      <div className="chipbar-scroll" role="group" aria-label="Ebenen ein- und ausschalten">
        {layers.map((layer) => {
          const active = isLayerActive(layer.id)
          return (
            <button
              key={layer.id}
              type="button"
              className={active ? 'chip is-active' : 'chip'}
              aria-pressed={active}
              // Die Ebenenfarbe wird nur als Akzent verwendet; Zustand und
              // Bedeutung stehen zusätzlich in Text und aria-pressed.
              style={{ '--chip-accent': layer.color } as React.CSSProperties}
              onClick={() => toggleLayer(layer.id)}
              title={layer.description}
            >
              <Icon name={layer.icon} size={18} />
              {layer.label}
            </button>
          )
        })}

        <span className="chipbar-separator" aria-hidden="true" />

        <button
          type="button"
          className="chip chip-view"
          aria-pressed={viewMode === 'list'}
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
        >
          <Icon name={viewMode === 'list' ? 'map' : 'list'} size={18} />
          {viewMode === 'list' ? 'Karte anzeigen' : 'Als Liste anzeigen'}
        </button>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {visibleItems.length === 1
          ? '1 Vorschlag wird angezeigt.'
          : `${visibleItems.length} Vorschläge werden angezeigt.`}
      </p>
    </section>
  )
}
