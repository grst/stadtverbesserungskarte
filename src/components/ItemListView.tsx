import { Link, useLocation } from 'react-router'
import { assetUrl, layerById } from '../data/content'
import { useAppState } from '../state/AppState'
import { Icon } from './Icon'

/**
 * Listenansicht als vollwertige Alternative zur Karte: ein Canvas ist mit
 * Tastatur und Screenreader nicht sinnvoll bedienbar, die gefilterten
 * Vorschläge müssen aber auf jedem Weg erreichbar sein.
 */
export function ItemListView() {
  const { visibleItems, setHoveredItemId } = useAppState()
  const location = useLocation()

  return (
    <section className="listview" aria-label="Alle Vorschläge als Liste">
      {visibleItems.length === 0 ? (
        <p className="listview-empty">
          Keine Vorschläge sichtbar. Schalte oben mindestens eine Ebene ein.
        </p>
      ) : (
        <ul className="listview-list">
          {visibleItems.map((item) => (
            <li key={item.id}>
              <Link
                className="listview-item"
                to={{ pathname: `/vorschlag/${item.id}`, search: location.search }}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                onFocus={() => setHoveredItemId(item.id)}
                onBlur={() => setHoveredItemId(null)}
              >
                <img
                  className="listview-image"
                  src={assetUrl(item.images.after)}
                  alt=""
                  loading="lazy"
                  width={240}
                  height={150}
                />
                <span className="listview-body">
                  <span className="listview-title">{item.title}</span>
                  <span className="listview-layers">
                    {item.layers.map((layerId) => {
                      const layer = layerById.get(layerId)
                      return (
                        <span
                          key={layerId}
                          className="badge"
                          style={{ '--chip-accent': layer?.color } as React.CSSProperties}
                        >
                          <Icon name={layer?.icon ?? 'pin'} size={14} />
                          {layer?.label ?? layerId}
                        </span>
                      )
                    })}
                  </span>
                  <span className="listview-author">Vorschlag von {item.author}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
