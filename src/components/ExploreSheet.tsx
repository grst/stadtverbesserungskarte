import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { assetUrl, layerById } from '../data/content'
import type { Item } from '../data/types'
import { SHEET_PEEK_PX } from '../layout'
import { useAppState } from '../state/AppState'

/**
 * Explore-Panel nach dem Vorbild von Google Maps: ruht eingefahren am unteren
 * Rand der Karte, lässt sich am Griff nach oben ziehen und rastet in drei
 * Stufen ein.
 *
 * Bewusst selbst gebaut statt mit einer Sheet-Bibliothek: die verbreiteten
 * Komponenten (vaul, react-modal-sheet) modellieren *modale, schließbare*
 * Dialoge. vaul setzt über Radix' Dialog `aria-hidden="true"` auf den ganzen
 * Rest der Seite – bei einem dauerhaft sichtbaren Panel wäre damit die
 * komplette Seite für Screenreader unsichtbar. Diese Umsetzung ist stattdessen
 * ein Landmark und der Griff ist zusätzlich mit der Tastatur bedienbar.
 */

type SheetSize = 'peek' | 'half' | 'full'

const SIZE_ORDER: SheetSize[] = ['peek', 'half', 'full']

/** Anteil der Kartenhöhe je Stufe; `peek` ist ein Pixelwert (siehe --sheet-peek). */
const SIZE_FRACTION: Record<Exclude<SheetSize, 'peek'>, number> = { half: 0.5, full: 0.92 }

const SIZE_LABEL: Record<SheetSize, string> = {
  peek: 'eingefahren',
  half: 'halbe Höhe',
  full: 'volle Höhe',
}

function heightFor(size: SheetSize, containerHeight: number): number {
  if (size === 'peek') return SHEET_PEEK_PX
  return Math.round(SIZE_FRACTION[size] * containerHeight)
}

export function ExploreSheet({ container }: { container: HTMLElement | null }) {
  const [size, setSize] = useState<SheetSize>('peek')
  /** Während des Ziehens die freie Höhe in px, sonst `null` (dann greift die Stufe). */
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const dragState = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)
  /** Nach einem echten Ziehen folgt vom Browser noch ein `click` – der wird verworfen. */
  const suppressClick = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const regionId = useId()

  const { visibleItems, setHoveredItemId, mapApi } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()

  const maxHeight = Math.max(SHEET_PEEK_PX, heightFor('full', containerHeight))

  // Die Stufenhöhen hängen an der Kartenhöhe, die sich bei Drehen des Geräts
  // oder beim Öffnen des Detailpanels ändert.
  useEffect(() => {
    if (!container) return
    setContainerHeight(container.clientHeight)
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [container])

  function openItem(item: Item) {
    mapApi?.focusItem(item)
    navigate({ pathname: `/vorschlag/${item.id}`, search: location.search })
  }

  const step = useCallback((direction: 1 | -1) => {
    setSize((current) => {
      const next = SIZE_ORDER.indexOf(current) + direction
      return SIZE_ORDER[Math.min(Math.max(next, 0), SIZE_ORDER.length - 1)]
    })
  }, [])

  // --------------------------------------------------------------- Ziehen
  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const sheet = sheetRef.current
    if (!sheet) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = { startY: event.clientY, startHeight: sheet.offsetHeight, moved: false }
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current
    if (!drag) return
    const delta = drag.startY - event.clientY
    // Erst ab einer kleinen Schwelle als Ziehen werten, damit ein Tippen auf
    // den Griff weiterhin als Klick durchgeht.
    if (!drag.moved && Math.abs(delta) < 4) return
    drag.moved = true
    setDragHeight(Math.min(Math.max(drag.startHeight + delta, SHEET_PEEK_PX), maxHeight))
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current
    if (!drag) return
    dragState.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (!drag.moved) return
    suppressClick.current = true

    // Auf die nächstgelegene Stufe einrasten.
    const current = dragHeight ?? drag.startHeight
    const nearest = SIZE_ORDER.reduce((best, candidate) =>
      Math.abs(heightFor(candidate, containerHeight) - current) <
      Math.abs(heightFor(best, containerHeight) - current)
        ? candidate
        : best,
    )
    setDragHeight(null)
    setSize(nearest)
  }

  const height =
    dragHeight !== null
      ? `${dragHeight}px`
      : size === 'peek'
        ? 'var(--sheet-peek)'
        : `${Math.round(SIZE_FRACTION[size] * 100)}%`

  // Darstellung an der tatsächlichen Höhe ausrichten, damit sie auch während
  // des Ziehens mitläuft und nicht erst beim Einrasten umschaltet.
  const effectiveHeight = dragHeight ?? heightFor(size, containerHeight)
  const compact = effectiveHeight < 240
  const expanded = containerHeight > 0 && effectiveHeight > 0.78 * containerHeight

  return (
    <section
      ref={sheetRef}
      id={regionId}
      className={dragHeight !== null ? 'sheet is-dragging' : 'sheet'}
      style={{ height }}
      aria-label="Vorschläge entdecken"
    >
      <button
        type="button"
        className="sheet-grip"
        aria-controls={regionId}
        aria-expanded={size !== 'peek'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          // Tippen schaltet eine Stufe weiter und von oben zurück auf klein.
          setSize(size === 'full' ? 'peek' : SIZE_ORDER[SIZE_ORDER.indexOf(size) + 1])
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            step(1)
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            step(-1)
          } else if (event.key === 'Home') {
            event.preventDefault()
            setSize('peek')
          } else if (event.key === 'End') {
            event.preventDefault()
            setSize('full')
          }
        }}
      >
        <span className="sheet-grip-bar" aria-hidden="true" />
        <span className="visually-hidden">
          Panelgröße ändern, aktuell {SIZE_LABEL[size]}. Ziehen oder Pfeiltasten nach oben und
          unten verwenden.
        </span>
      </button>

      <div className="sheet-head">
        <h2 className="sheet-title">Entdecken</h2>
        <p className="sheet-count">
          {visibleItems.length === 1 ? '1 Vorschlag' : `${visibleItems.length} Vorschläge`}
        </p>
      </div>

      {visibleItems.length === 0 ? (
        <p className="sheet-empty">
          Keine Vorschläge sichtbar. Schalte oben mindestens eine Ebene ein.
        </p>
      ) : (
        <ul
          className={
            expanded
              ? 'sheet-strip is-expanded'
              : compact
                ? 'sheet-strip is-compact'
                : 'sheet-strip'
          }
          aria-label="Vorschläge"
        >
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="tile"
                onClick={() => openItem(item)}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                onFocus={() => setHoveredItemId(item.id)}
                onBlur={() => setHoveredItemId(null)}
              >
                <img
                  className="tile-image"
                  src={assetUrl(item.images.after)}
                  alt=""
                  loading="lazy"
                  width={320}
                  height={200}
                />
                <span className="tile-body">
                  <span className="tile-title">{item.title}</span>
                  <span className="tile-layers">
                    {item.layers
                      .map((layerId) => layerById.get(layerId)?.label ?? layerId)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
