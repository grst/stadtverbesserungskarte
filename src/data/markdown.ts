import DOMPurify from 'dompurify'
import { Marked, type RendererObject } from 'marked'

/**
 * Markdown → bereinigtes HTML. Genutzt für die Textseiten aus content/ und für
 * die Beschreibungen aus data/items/<ordner>/description.md.
 */
export interface MarkdownOptions {
  /**
   * Verschiebt alle Überschriften um diese Anzahl Ebenen nach unten. Für eine
   * Beschreibung, die unter einer bereits vorhandenen `h1` steht, wird so aus
   * `#` im Text ein `h2` – die Gliederung der Seite bleibt lückenlos.
   */
  headingOffset?: number
  /**
   * Löst die Bildpfade im Text auf. Ohne diese Funktion bleiben sie, wie sie
   * im Markdown stehen.
   */
  resolveImage?: (src: string) => string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderMarkdown(markdown: string, options: MarkdownOptions = {}): string {
  const { headingOffset = 0, resolveImage } = options
  const renderer: RendererObject = {}

  if (headingOffset !== 0) {
    renderer.heading = function heading({ tokens, depth }) {
      const level = Math.min(Math.max(depth + headingOffset, 1), 6)
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`
    }
  }

  if (resolveImage) {
    renderer.image = ({ href, title, text }) => {
      const attributes = [`src="${escapeHtml(resolveImage(href))}"`, `alt="${escapeHtml(text)}"`]
      if (title) attributes.push(`title="${escapeHtml(title)}"`)
      return `<img ${attributes.join(' ')} loading="lazy">`
    }
  }

  const marked = new Marked({ gfm: true, breaks: false })
  marked.use({ renderer })
  return DOMPurify.sanitize(marked.parse(markdown, { async: false }))
}
