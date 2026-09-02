import { Link } from 'react-router'

/**
 * Bewusst schmale, dauerhaft sichtbare Fußzeile.
 *
 * § 5 DDG verlangt, dass das Impressum „leicht erkennbar, unmittelbar
 * erreichbar und ständig verfügbar“ ist. Auf der Kartenseite scrollt das Rad
 * die Karte statt der Seite – eine Fußzeile unter der Falz wäre also kaum zu
 * finden. Deshalb rechnet `--footer-h` in die Kartenhöhe hinein, die Zeile
 * steht immer im Blickfeld.
 *
 * Enthalten ist nur, was hier hingehört: Impressum, Datenschutzerklärung und
 * der Urhebervermerk des Projekts. Die Karte trägt ihren
 * OpenStreetMap-Vermerk selbst (siehe `attributionOptions` in
 * src/map/mapController.ts), die Lizenzhinweise der verwendeten
 * Softwarepakete stehen im Impressum verlinkt.
 */
export function Footer() {
  return (
    <footer className="footer">
      <nav className="footer-inner" aria-label="Rechtliches">
        <Link className="footer-link" to="/impressum">
          Impressum
        </Link>
        <Link className="footer-link" to="/datenschutz">
          Datenschutz
        </Link>
        <span className="footer-copy">© {new Date().getFullYear()} Stadtverbesserungskarte</span>
      </nav>
    </footer>
  )
}
