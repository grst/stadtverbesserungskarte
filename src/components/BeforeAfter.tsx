import { useEffect, useRef, useState } from 'react'
import { itemImageUrl } from '../data/content'
import type { ItemImages } from '../data/types'

/**
 * Vorher/Nachher-Vergleich. Die eigentliche Arbeit macht das Web Component
 * `img-comparison-slider` (Maus, Touch und Pfeiltasten). Der Regler startet in
 * der Mitte, sodass beide Bilder je zur Hälfte sichtbar sind.
 *
 * Ergänzt wird nur, was das Component nicht mitbringt: ARIA-Werte, damit der
 * Regler auch mit Screenreader bedienbar ist.
 */
export function BeforeAfter({ images }: { images: ItemImages }) {
  const sliderRef = useRef<HTMLElement>(null)
  const [value, setValue] = useState(50)

  useEffect(() => {
    const element = sliderRef.current
    if (!element) return
    const onSlide = () => {
      const current = (element as HTMLElement & { value?: number }).value
      if (typeof current === 'number') setValue(Math.round(current))
    }
    element.addEventListener('slide', onSlide)
    return () => element.removeEventListener('slide', onSlide)
  }, [])

  return (
    <figure className="beforeafter">
      <div className="beforeafter-frame">
        <img-comparison-slider
          ref={sliderRef}
          value="50"
          className="beforeafter-slider"
          role="slider"
          aria-orientation="horizontal"
          aria-label="Vergleich von Vorher- und Nachher-Bild"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value} Prozent des Nachher-Bildes sichtbar`}
        >
          <img
            slot="first"
            src={itemImageUrl(images.before)}
            alt={images.beforeAlt}
            width={1600}
            height={1000}
          />
          <img
            slot="second"
            src={itemImageUrl(images.after)}
            alt={images.afterAlt}
            width={1600}
            height={1000}
          />
        </img-comparison-slider>

        <span className="beforeafter-badge is-before" aria-hidden="true">
          Vorher
        </span>
        <span className="beforeafter-badge is-after" aria-hidden="true">
          Nachher
        </span>
      </div>
      <figcaption className="beforeafter-caption">
        Regler verschieben, um zwischen heutigem Zustand und Vorschlag zu wechseln – mit Maus,
        Finger oder den Pfeiltasten. Das Nachher-Bild ist eine KI-Bearbeitung des Vorher-Bildes.
        <span className="beforeafter-copyright">{images.copyright}</span>
      </figcaption>
    </figure>
  )
}
