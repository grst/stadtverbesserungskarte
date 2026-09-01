export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-copy">
          © {new Date().getFullYear()} Stadtverbesserungskarte Immenstadt i. Allgäu. Ein
          unabhängiges Projekt, unterstützt vom Ortsverband Bündnis 90/Die Grünen Immenstadt.
        </p>
        <p className="footer-copy">
          Kartendaten ©{' '}
          <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">
            OpenStreetMap-Mitwirkende
          </a>
          , Kartendarstellung © OpenStreetMap. Karte mit{' '}
          <a href="https://openlayers.org/" rel="noreferrer">
            OpenLayers
          </a>
          .
        </p>
        <nav aria-label="Rechtliches">
          <ul className="footer-links">
            <li>
              {/* Noch ohne Ziel – der Text folgt. */}
              <a href="/impressum">Impressum</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
