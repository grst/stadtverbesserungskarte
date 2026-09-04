import type { Safety } from '../data/types'
import { SAFETY_APPEARANCE } from '../map/styles'

/**
 * Der Strich einer Bewertung als reines CSS – gespeist aus denselben Werten,
 * mit denen die Karte zeichnet (`SAFETY_APPEARANCE`). Er wird in der
 * Erklärkarte und im Popup einer angeklickten Verbindung gebraucht; deshalb
 * steht er hier und nicht in einer der beiden Komponenten.
 *
 * `aria-hidden`: der Strich wiederholt nur, was direkt daneben als Text steht.
 */
export function SafetySwatch({ safety }: { safety: Safety }) {
  const appearance = SAFETY_APPEARANCE[safety]

  return (
    <span
      className="legend-swatch"
      style={
        {
          '--swatch-color': appearance.color,
          // Gedeckelt: die 7 px der Bewertung „Unsicher“ wirken im kleinen
          // Kasten deutlich dicker als draußen in der Karte.
          '--swatch-width': `${Math.min(appearance.width, 6)}px`,
          '--swatch-dash': appearance.lineDash ? `${appearance.lineDash[0]}px` : '999px',
          '--swatch-gap': appearance.lineDash ? `${appearance.lineDash[1]}px` : '0px',
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  )
}
