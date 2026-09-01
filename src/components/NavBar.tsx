import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link, NavLink, useLocation, useMatch, useNavigate } from 'react-router'
import { useIsWideViewport } from '../hooks/useMediaQuery'
import { Icon } from './Icon'

interface InternalLink {
  kind: 'internal'
  label: string
  to: string
}

interface ExternalLink {
  kind: 'external'
  label: string
  href: string
}

export const navLinks: Array<InternalLink | ExternalLink> = [
  { kind: 'internal', label: 'Info', to: '/info' },
  { kind: 'internal', label: 'Idee einreichen', to: '/idee-einreichen' },
  // Noch nicht erreichbar – die Seite entsteht erst.
  { kind: 'external', label: 'Grüne Immenstadt', href: 'https://gruene-immenstadt.de' },
  { kind: 'external', label: 'Grüne Oberallgäu', href: 'https://gruene-oa.de' },
]

function LinkList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="nav-list">
      {navLinks.map((link) => (
        <li key={link.label}>
          {link.kind === 'internal' ? (
            <NavLink
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
              onClick={onNavigate}
            >
              {link.label}
            </NavLink>
          ) : (
            <a className="nav-link" href={link.href} rel="noreferrer" onClick={onNavigate}>
              {link.label}
              <Icon name="external" size={16} className="nav-link-icon" />
              <span className="visually-hidden"> (externer Link)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const isWide = useIsWideViewport()
  const location = useLocation()
  const navigate = useNavigate()
  const detailMatch = useMatch('/vorschlag/:id')

  // Auf schmalen Viewports ersetzt der Zurück-Button den Titel, solange ein
  // Vorschlag als Vollbildseite offen ist.
  const showBackButton = Boolean(detailMatch) && !isWide

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {showBackButton ? (
          <button
            type="button"
            className="icon-button navbar-back"
            onClick={() => navigate({ pathname: '/', search: location.search })}
          >
            <Icon name="back" size={22} />
            Zurück zur Karte
          </button>
        ) : (
          <Link to={{ pathname: '/', search: location.search }} className="navbar-brand">
            <Icon name="pin" size={22} className="navbar-brand-icon" />
            <span>
              Stadtverbesserungskarte
              <span className="navbar-brand-town">Immenstadt i. Allgäu</span>
            </span>
          </Link>
        )}

        {isWide ? (
          <nav aria-label="Hauptnavigation" className="navbar-nav">
            <LinkList />
          </nav>
        ) : (
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="icon-button navbar-burger">
                <Icon name="menu" size={24} />
                <span className="visually-hidden">Menü öffnen</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="menu-overlay" />
              <Dialog.Content className="menu-panel" aria-describedby={undefined}>
                <div className="menu-panel-head">
                  <Dialog.Title className="menu-panel-title">Menü</Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" className="icon-button">
                      <Icon name="close" size={24} />
                      <span className="visually-hidden">Menü schließen</span>
                    </button>
                  </Dialog.Close>
                </div>
                <nav aria-label="Hauptnavigation">
                  <LinkList onNavigate={() => setMenuOpen(false)} />
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>
    </header>
  )
}
