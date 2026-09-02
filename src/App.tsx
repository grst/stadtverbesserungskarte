import { Outlet, Route, Routes } from 'react-router'
import datenschutzMarkdown from '../content/datenschutz.md?raw'
import ideeEinreichenMarkdown from '../content/idee-einreichen.md?raw'
import impressumMarkdown from '../content/impressum.md?raw'
import infoMarkdown from '../content/info.md?raw'
import { Footer } from './components/Footer'
import { ItemDetail } from './components/ItemDetail'
import { MarkdownPage } from './components/MarkdownPage'
import { NavBar } from './components/NavBar'
import { MapPage } from './pages/MapPage'
import { NotFoundPage } from './pages/NotFoundPage'

function Shell() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <NavBar />
      <Outlet />
      <Footer />
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        {/* Kartenseite und Detailansicht teilen sich eine Route, damit die
            OpenLayers-Karte beim Öffnen eines Vorschlags nicht neu aufgebaut
            werden muss. */}
        <Route path="/" element={<MapPage />}>
          <Route path="vorschlag/:id" element={<ItemDetail />} />
        </Route>
        <Route
          path="/info"
          element={<MarkdownPage markdown={infoMarkdown} title="Über dieses Projekt" />}
        />
        <Route
          path="/idee-einreichen"
          element={<MarkdownPage markdown={ideeEinreichenMarkdown} title="Idee einreichen" />}
        />
        <Route
          path="/impressum"
          element={<MarkdownPage markdown={impressumMarkdown} title="Impressum" />}
        />
        <Route
          path="/datenschutz"
          element={<MarkdownPage markdown={datenschutzMarkdown} title="Datenschutzerklärung" />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
