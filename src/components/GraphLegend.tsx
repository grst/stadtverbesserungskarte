import { useIsWideViewport } from '../hooks/useMediaQuery'
import { SAFETY_APPEARANCE, SAFETY_ORDER } from '../map/styles'

/**
 * Legende zum Ortsteil-Graphen. Bewusst echtes DOM statt eines OpenLayers-
 * Controls: so ist sie zoombar, vorlesbar und folgt der Typografie der Seite.
 *
 * Auf schmalen Viewports ist sie eingeklappt, damit sie die Karte nicht
 * zudeckt – `<details>` bringt die Auf-/Zuklapp-Bedienung inklusive Tastatur
 * und Screenreader-Ansage mit.
 */
export function GraphLegend() {
  const isWide = useIsWideViewport()

  return (
    <details className="legend" open={isWide}>
      <summary className="legend-summary">Legende: Radverbindungen</summary>
      <ul className="legend-list">
        {SAFETY_ORDER.map((safety) => {
          const appearance = SAFETY_APPEARANCE[safety]
          return (
            <li key={safety} className="legend-item">
              <span
                className="legend-swatch"
                style={
                  {
                    '--swatch-color': appearance.color,
                    '--swatch-width': `${Math.min(appearance.width, 6)}px`,
                    '--swatch-dash': appearance.lineDash ? `${appearance.lineDash[0]}px` : '999px',
                    '--swatch-gap': appearance.lineDash ? `${appearance.lineDash[1]}px` : '0px',
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
              <span className="legend-label">
                {appearance.label}
                <span className="legend-hint"> ({appearance.description})</span>
              </span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
