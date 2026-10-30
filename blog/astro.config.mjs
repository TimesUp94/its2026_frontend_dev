// @ts-check
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  /*
   * site e' obbligatorio, non e' un vezzo: la sitemap e il feed RSS contengono
   * indirizzi assoluti, e un indirizzo assoluto non si puo' inventare. In
   * produzione si passa SITE_URL, altrimenti vale il server di sviluppo.
   */
  site: process.env.SITE_URL ?? 'http://localhost:4321',

  // Il valore predefinito. Lo scriviamo per dire una cosa sola: qui non c'e'
  // nessun server. "astro build" produce una cartella di file HTML, e quella
  // cartella si pubblica dove si vuole, anche su un hosting che non sa cosa sia Node.
  output: 'static',

  integrations: [
    // React serve a una cosa sola, in una pagina sola: l'isola del prezzo dal vivo.
    react(),
    // Genera sitemap-index.xml partendo dalle pagine che ha davvero costruito.
    sitemap(),
  ],

  vite: {
    // Lo stesso plugin di Tailwind v4 che usiamo nella SPA: qui dentro c'e' Vite.
    plugins: [tailwindcss()],
  },
})
