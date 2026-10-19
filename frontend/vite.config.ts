import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Terza sorpresa: nel pacchetto desktop l'index.html non e' servito dalla radice
  // di un web server, quindi i percorsi degli asset devono essere relativi: cosi
  // funzionano anche aprendo il file da file://. Sul web resta '/'.
  base: mode === 'desktop' || process.env.VITE_DESKTOP === '1' ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // tauri dev apre http://localhost:5173: se Vite cambiasse porta la finestra resterebbe bianca.
    strictPort: true,
    watch: {
      // Durante la compilazione Rust src-tauri/target cambia di continuo e il
      // watcher di Vite si ferma con EBUSY: va escluso.
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))
