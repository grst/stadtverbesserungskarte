import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

export function NotFoundPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = 'Seite nicht gefunden – Stadtverbesserungskarte Immenstadt i. Allgäu'
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <main id="main" className="page">
      <div className="prose">
        <h1 ref={headingRef} tabIndex={-1}>
          Seite nicht gefunden
        </h1>
        <p>Diese Adresse gehört zu keiner Seite dieses Projekts.</p>
        <p>
          <Link to="/">Zurück zur Karte</Link>
        </p>
      </div>
    </main>
  )
}
