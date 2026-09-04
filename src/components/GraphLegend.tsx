import { useState } from 'react'
import { graph, safetyCounts } from '../data/content'
import { useIsWideViewport } from '../hooks/useMediaQuery'
import { SAFETY_APPEARANCE, SAFETY_ORDER } from '../map/styles'
import { SafetySwatch } from './SafetySwatch'

/**
 * Erklärkarte zum Ortsteil-Graphen. Sie beantwortet drei Fragen, die eine
 * reine Farbtabelle offen lässt: worum es überhaupt geht, was Punkte und
 * Linien bedeuten und wie sich die Bewertungen verteilen.
 *
 * Die Zuordnung Linie → Bewertung leistet nicht dieser Kasten, sondern die
 * Karte selbst: ab Zoomstufe 12 steht die Bewertung als Wort auf der Linie
 * (siehe `edgeLabelStyle` in src/map/styles.ts). Der Kasten muss also nicht
 * mehr Stück für Stück mit der Karte verglichen werden.
 *
 * Bewusst echtes DOM statt eines OpenLayers-Controls: so ist er zoombar,
 * vorlesbar und folgt der Typografie der Seite.
 *
 * Auf schmalen Viewports startet er eingeklappt, damit er die Karte nicht
 * zudeckt – `<details>` bringt die Auf-/Zuklapp-Bedienung inklusive Tastatur
 * und Screenreader-Ansage mit. Eingeklappt zeigt die Titelzeile die drei
 * Strichmuster als Vorschau, damit die Kodierung nie ganz verschwindet.
 */
export function GraphLegend() {
  const isWide = useIsWideViewport()
  /**
   * `null` = noch nicht selbst entschieden, dann gilt der Viewport. Ohne
   * diesen Zustand wäre `open` ein bei jedem Rendern neu gesetztes Attribut:
   * ein von Hand aufgeklappter Kasten fiele wieder zu, sobald `MapView` neu
   * rendert – etwa beim Klick auf eine Verbindung.
   */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)

  return (
    <details
      className="legend"
      open={manualOpen ?? isWide}
      onToggle={(event) => setManualOpen(event.currentTarget.open)}
    >
      <summary className="legend-summary">
        Wie sicher fährt man von Ortsteil zu Ortsteil?
        {/* Eingeklappt trägt die Titelzeile die Kodierung im Kleinen. Mit den
            Wörtern und nicht nur mit den Strichen: drei farbige Balken sagen
            nur, dass es drei Klassen gibt, nicht welche. */}
        <span className="legend-scale">
          {SAFETY_ORDER.map((safety) => (
            <span key={safety} className="legend-scale-item">
              <SafetySwatch safety={safety} />
              {SAFETY_APPEARANCE[safety].shortLabel}
            </span>
          ))}
        </span>
      </summary>

      <p className="legend-intro">
        Die Punkte sind Ortsteile, die Linien die {graph.edges.length} Radverbindungen
        dazwischen.
      </p>

      <ul className="legend-list">
        {SAFETY_ORDER.map((safety) => {
          const appearance = SAFETY_APPEARANCE[safety]
          return (
            <li key={safety} className="legend-item">
              <SafetySwatch safety={safety} />
              <span className="legend-label">
                {appearance.label}
                {appearance.example && (
                  <span className="legend-example">{appearance.example}</span>
                )}
              </span>
              <span className="legend-count">
                {safetyCounts[safety]}
                <span className="visually-hidden"> Verbindungen</span>
              </span>
            </li>
          )
        })}
      </ul>

      <p className="legend-hint">
        Beim Hineinzoomen steht die Bewertung an jeder Linie. Ein Klick auf eine Linie zeigt,
        warum sie so bewertet ist.
      </p>
    </details>
  )
}
