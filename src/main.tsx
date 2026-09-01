import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import 'ol/ol.css'
// Registriert das Web Component <img-comparison-slider> samt Basis-CSS.
import 'img-comparison-slider'
import 'img-comparison-slider/dist/styles.css'
import './styles/tokens.css'
import './styles/global.css'
import { App } from './App'
import { AppStateProvider } from './state/AppState'

const container = document.getElementById('root')
if (!container) throw new Error('Element #root fehlt in index.html.')

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
)
