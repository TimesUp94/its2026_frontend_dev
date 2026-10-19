import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  // Nella build desktop i percorsi degli asset devono essere relativi: aperto con file://
  // un base assoluto come '/assets/index.js' punterebbe alla radice del disco.
  // VITE_DESKTOP arriva da .env.desktop (o dall'ambiente), vedi --mode desktop.
  base:
    command === 'build' &&
    (process.env.VITE_DESKTOP ?? loadEnv(mode, import.meta.dirname).VITE_DESKTOP) === '1'
      ? './'
      : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))
