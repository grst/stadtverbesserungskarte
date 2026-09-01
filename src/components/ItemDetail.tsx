import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { itemById, itemImageUrl, layerById } from '../data/content'
import { renderMarkdown } from '../data/markdown'
import { useIsWideViewport } from '../hooks/useMediaQuery'
import { BeforeAfter } from './BeforeAfter'
import { Icon } from './Icon'

export function ItemDetail() {
  const { id } = useParams()
  const item = id ? itemById.get(id) : undefined
  const isWide = useIsWideViewport()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const close = useCallback(
    () => navigate({ pathname: '/', search: location.search }),
    [navigate, location.search],
  )

  // Fokus in das geöffnete Detail holen, damit Tastatur- und
  // Screenreader-Nutzung dort weitergeht, wo der Inhalt gewechselt hat.
  // `preventScroll`, damit das Vorher/Nachher-Bild oben sichtbar bleibt.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    if (sectionRef.current) sectionRef.current.scrollTop = 0
  }, [id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  // Die Beschreibung ist Markdown (der Rumpf der description.md). Überschriften
  // rutschen eine Ebene tiefer, damit die `h1` des Titels darüber stehen bleibt.
  const descriptionHtml = useMemo(
    () =>
      item ? renderMarkdown(item.description, { headingOffset: 1, resolveImage: itemImageUrl }) : '',
    [item],
  )

  const className = isWide ? 'detail is-panel' : 'detail is-fullscreen'

  if (!item) {
    return (
      <section ref={sectionRef} className={className} aria-label="Vorschlag nicht gefunden">
        <div className="detail-scroll">
          <h1 className="detail-title" ref={headingRef} tabIndex={-1}>
            Vorschlag nicht gefunden
          </h1>
          <p>
            Zu dieser Adresse gibt es keinen Vorschlag. Vielleicht wurde er umbenannt oder
            entfernt.
          </p>
          <Link className="button" to={{ pathname: '/', search: location.search }}>
            Zur Karte
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className={className} aria-label={`Vorschlag: ${item.title}`}>
      <div className="detail-scroll">
        {isWide && (
          <button type="button" className="icon-button detail-close" onClick={close}>
            <Icon name="close" size={22} />
            <span className="visually-hidden">Vorschlag schließen</span>
          </button>
        )}

        <BeforeAfter images={item.images} />

        <h1 className="detail-title" ref={headingRef} tabIndex={-1}>
          {item.title}
        </h1>

        <ul className="detail-layers" aria-label="Ebenen">
          {item.layers.map((layerId) => {
            const layer = layerById.get(layerId)
            return (
              <li
                key={layerId}
                className="badge"
                style={{ '--chip-accent': layer?.color } as React.CSSProperties}
              >
                <Icon name={layer?.icon ?? 'pin'} size={16} />
                {layer?.label ?? layerId}
              </li>
            )
          })}
        </ul>

        <div className="detail-text" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />

        <p className="detail-author">
          Vorschlag von <strong>{item.author}</strong>
        </p>
      </div>
    </section>
  )
}
