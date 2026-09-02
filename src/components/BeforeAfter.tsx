import { useCallback, useEffect, useRef, useState } from 'react'
import { itemImageUrl } from '../data/content'
import type { ItemImages } from '../data/types'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'

/**
 * `value` ist der Anteil des **Vorher**-Bildes, gemessen von links: Der Slot
 * `first` (= Vorher) liegt als beschnittene Ebene über `second` (= Nachher).
 * 100 heißt also „nur Vorher“, 0 heißt „nur Nachher“.
 */
const ONLY_BEFORE = 100
const COMPARE = 50
const ONLY_AFTER = 0

/**
 * Startposition. Bewusst nicht 50: Ein symmetrischer Schnitt sieht aus wie zwei
 * nebeneinander gelegte Fotos. Erst die Asymmetrie zeigt, dass ein Bild über
 * dem anderen liegt – das ist der Hinweis, den auch Leute bekommen, die
 * „Bewegung reduzieren“ eingestellt haben.
 */
const START = 65

/** Einmalige Bewegung beim Öffnen: kurz warten, nach links, zurück zur Mitte. */
const NUDGE_DELAY_MS = 350
const NUDGE_LEGS: ReadonlyArray<{ to: number; duration: number }> = [
  { to: 35, duration: 550 },
  { to: COMPARE, duration: 400 },
]

/** Toleranz, damit auch ein von Hand an den Rand gezogener Regler die passende Schaltfläche markiert. */
const EDGE_TOLERANCE = 4
/** Ab hier ist die jeweilige Bildhälfte so schmal, dass ihre Beschriftung nur noch verwirrt. */
const BADGE_TOLERANCE = 8

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type SliderElement = HTMLElement & { value: number }

/**
 * Vorher/Nachher-Vergleich. Die eigentliche Arbeit macht das Web Component
 * `img-comparison-slider` (Maus, Touch und Pfeiltasten).
 *
 * Ergänzt wird, was das Component nicht mitbringt:
 * ARIA-Werte für Screenreader, eine sichtbare Schaltflächengruppe (der Regler
 * allein ist auf einem Foto kaum als Bedienelement zu erkennen) und eine
 * einmalige Bewegung beim Öffnen, die zeigt, dass sich das Bild ändern lässt.
 */
export function BeforeAfter({ images }: { images: ItemImages }) {
  const sliderRef = useRef<HTMLElement>(null)
  const [value, setValue] = useState(START)
  const reducedMotion = usePrefersReducedMotion()

  // Aufräumen der Einführungsbewegung. Liegt in einer Ref, weil sowohl der
  // Effekt selbst als auch jede Nutzereingabe sie abbrechen können muss.
  const stopNudgeRef = useRef<(() => void) | null>(null)
  const stopNudge = useCallback(() => {
    stopNudgeRef.current?.()
    stopNudgeRef.current = null
  }, [])

  /** Regler auf eine feste Position setzen. Der Setter des Web Components löst kein `slide` aus, darum der State von Hand. */
  const setPosition = useCallback(
    (next: number) => {
      stopNudge()
      const element = sliderRef.current as SliderElement | null
      if (element) element.value = next
      setValue(next)
    },
    [stopNudge],
  )

  useEffect(() => {
    const element = sliderRef.current
    if (!element) return
    // `slide` sendet das Component nur bei echter Eingabe – der Setter oben
    // nicht. Es ist damit zugleich das Signal, die Einführungsbewegung
    // abzubrechen, sobald jemand selbst zieht.
    const onSlide = () => {
      stopNudge()
      const current = (element as SliderElement).value
      if (typeof current === 'number') setValue(Math.round(current))
    }
    element.addEventListener('slide', onSlide)
    return () => element.removeEventListener('slide', onSlide)
  }, [stopNudge])

  useEffect(() => {
    const element = sliderRef.current as SliderElement | null
    if (!element) return

    // Beim Wechsel zu einem anderen Vorschlag wieder von vorn beginnen.
    element.value = START
    setValue(START)
    if (reducedMotion) return

    let frame = 0
    let leg = 0
    let from = START
    let legStart = 0
    const timer = window.setTimeout(() => {
      const step = (now: number) => {
        if (!legStart) legStart = now
        const { to, duration } = NUDGE_LEGS[leg]
        const progress = Math.min(1, (now - legStart) / duration)
        element.value = from + (to - from) * easeInOut(progress)
        if (progress < 1) {
          frame = window.requestAnimationFrame(step)
          return
        }
        leg += 1
        if (leg < NUDGE_LEGS.length) {
          from = to
          legStart = 0
          frame = window.requestAnimationFrame(step)
          return
        }
        // Erst am Ende einmal in den State – währenddessen wären es ~60
        // Renders pro Sekunde für eine reine Animation.
        stopNudgeRef.current = null
        setValue(COMPARE)
      }
      frame = window.requestAnimationFrame(step)
    }, NUDGE_DELAY_MS)

    stopNudgeRef.current = () => {
      window.clearTimeout(timer)
      if (frame) window.cancelAnimationFrame(frame)
    }
    return stopNudge
  }, [images, reducedMotion, stopNudge])

  const mode =
    value >= ONLY_BEFORE - EDGE_TOLERANCE
      ? 'before'
      : value <= ONLY_AFTER + EDGE_TOLERANCE
        ? 'after'
        : 'compare'

  const isEdge = value <= BADGE_TOLERANCE || value >= 100 - BADGE_TOLERANCE

  const modes = [
    { id: 'before', label: 'Vorher', position: ONLY_BEFORE },
    { id: 'compare', label: 'Vergleich', position: COMPARE },
    { id: 'after', label: 'Nachher', position: ONLY_AFTER },
  ] as const

  return (
    <figure className="beforeafter">
      <div className="beforeafter-frame">
        <img-comparison-slider
          ref={sliderRef}
          value={String(START)}
          className="beforeafter-slider"
          role="slider"
          aria-orientation="horizontal"
          aria-label="Vergleich von Vorher- und Nachher-Bild"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`Vorher-Bild zu ${value} Prozent sichtbar, Nachher-Bild zu ${100 - value} Prozent`}
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
          {/* Eigener Griff statt des dünnen Standard-SVG: Der helle Standardgriff
              verschwindet auf hellen Fotos. Rein dekorativ – das Component setzt
              `pointer-events: none` darauf, gezogen wird überall im Bild. */}
          <span
            slot="handle"
            className="beforeafter-handle"
            aria-hidden="true"
            // Am Rand ragt der Griff aus dem Bild und wird zur halben Scheibe
            // beschnitten. Dort gibt es ohnehin nichts mehr zu ziehen.
            data-hidden={isEdge ? '' : undefined}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
              <path
                d="M10 7 L5.5 12 L10 17 M14 7 L18.5 12 L14 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </img-comparison-slider>

        <span
          className="beforeafter-badge is-before"
          aria-hidden="true"
          data-hidden={value <= BADGE_TOLERANCE ? '' : undefined}
        >
          Vorher
        </span>
        <span
          className="beforeafter-badge is-after"
          aria-hidden="true"
          data-hidden={value >= 100 - BADGE_TOLERANCE ? '' : undefined}
        >
          Nachher
        </span>
      </div>

      {/* Sichtbare Bedienelemente. Der Regler im Bild ist für sich genommen
          schwer zu entdecken; diese Knöpfe sagen ohne Umweg, dass es hier zwei
          Bilder gibt – und sind zugleich der einfachere Weg mit der Tastatur. */}
      <div className="beforeafter-modes" role="group" aria-label="Bildansicht wählen">
        {modes.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={mode === entry.id ? 'beforeafter-mode is-active' : 'beforeafter-mode'}
            aria-pressed={mode === entry.id}
            onClick={() => setPosition(entry.position)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <figcaption className="beforeafter-caption">
        Links der heutige Zustand, rechts der Vorschlag. Trennlinie ziehen oder die Knöpfe nutzen.
        Das Nachher-Bild ist eine KI-Bearbeitung des Vorher-Bildes.
        {/* Das © steht hier und nicht in der description.md – so ist die
            Schreibweise überall gleich. */}
        <span className="beforeafter-copyright">© {images.copyright}</span>
      </figcaption>
    </figure>
  )
}
