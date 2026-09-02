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
  /**
   * Löst Linkziele auf. Nötig für absolute Pfade wie `/impressum`: auf einer
   * GitHub-Projektseite liegt die App unter `/<repo>/`, ein `/impressum` im
   * Markdown würde also ins Leere führen.
   */
  resolveLink?: (href: string) => string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderMarkdown(markdown: string, options: MarkdownOptions = {}): string {
  const { headingOffset = 0, resolveImage, resolveLink } = options
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

  if (resolveLink) {
    renderer.link = function link({ href, title, tokens }) {
      const attributes = [`href="${escapeHtml(resolveLink(href))}"`]
      if (title) attributes.push(`title="${escapeHtml(title)}"`)
      // Externe Ziele bekommen dasselbe `rel` wie die Links im übrigen UI.
      if (/^https?:/i.test(href)) attributes.push('rel="noreferrer"')
      return `<a ${attributes.join(' ')}>${this.parser.parseInline(tokens)}</a>`
    }
  }

  const marked = new Marked({ gfm: true, breaks: false })
  marked.use({ renderer })
  return DOMPurify.sanitize(marked.parse(markdown, { async: false }))
}
