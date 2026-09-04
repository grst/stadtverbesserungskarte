import { useEffect, useState } from 'react'
import { Icon } from './Icon'

/**
 * Hinweisleiste über der Kopfleiste, solange die Seite im Aufbau ist.
 *
 * Das Schließen wirkt nur für den aktuellen Seitenaufruf: Die
 * Datenschutzerklärung sagt zu, dass die Seite nichts im Browser ablegt – also
 * kein `localStorage` für den weggeklickten Hinweis.
 *
 * Die gemessene Höhe landet als `--banner-h` am <html>-Element, weil die
 * Kartenfläche ihre Höhe aus `100dvh` minus aller festen Leisten berechnet.
 */
export function SiteBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (!element) {
      root.style.removeProperty('--banner-h')
      return
    }
    // Der Text bricht je nach Viewport unterschiedlich um, die Höhe steht also
    // nicht fest.
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--banner-h', `${element.offsetHeight}px`)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--banner-h')
    }
  }, [element])

  if (dismissed) return null

  return (
    <div ref={setElement} className="site-banner">
      <div className="site-banner-inner">
        <Icon name="info" size={18} className="site-banner-icon" />
        <p className="site-banner-text">
          Diese Seite befindet sich noch im Aufbau. Inhalte sind exemplarisch und nicht vollständig.
        </p>
        <button
          type="button"
          className="icon-button site-banner-close"
          onClick={() => setDismissed(true)}
        >
          <Icon name="close" size={20} />
          <span className="visually-hidden">Hinweis schließen</span>
        </button>
      </div>
    </div>
  )
}
