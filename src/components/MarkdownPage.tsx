import { useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Rendert eine der Markdown-Dateien aus content/. Der Text wird beim Build als
 * Rohtext importiert, hier zu HTML kompiliert und vor dem Einsetzen bereinigt.
 */
export function MarkdownPage({ markdown, title }: { markdown: string; title: string }) {
  const containerRef = useRef<HTMLElement>(null)

  const html = useMemo(() => {
    const parsed = marked.parse(markdown, { async: false, gfm: true, breaks: false })
    return DOMPurify.sanitize(parsed)
  }, [markdown])

  useEffect(() => {
    document.title = `${title} – Stadtverbesserungskarte Immenstadt i. Allgäu`

    // Fokus auf die Überschrift der neuen Seite, nicht auf den ganzen Artikel:
    // so umschließt der Fokusring nur die Überschrift. `preventScroll`, weil
    // sonst der Browser an der Überschrift vorbeiscrollt und die sticky
    // Kopfzeile sie verdeckt.
    const container = containerRef.current
    const target = container?.querySelector<HTMLElement>('h1') ?? container
    if (target) {
      if (target !== container) target.tabIndex = -1
      target.focus({ preventScroll: true })
    }
    window.scrollTo({ top: 0 })
  }, [title, html])

  return (
    <main id="main" className="page">
      <article
        ref={containerRef}
        tabIndex={-1}
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  )
}
