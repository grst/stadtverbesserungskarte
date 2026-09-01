import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `VITE_BASE` lets the GitHub Pages workflow serve the site from a repository
// sub-path (e.g. `/stadtverbesserungskarte/`) without touching the source.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    // OpenLayers is large; keep the warning threshold realistic instead of
    // splitting the map away from the shell that always needs it.
    chunkSizeWarningLimit: 800,
  },
})
