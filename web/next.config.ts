import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /*
   * cacheComponents e' il modello di cache di Next 16, e lo lasciamo acceso perche'
   * e' quello che si ottiene oggi con "npx create-next-app@latest".
   *
   * La regola, in una riga: nulla e' in cache se non lo chiedete voi. Una funzione
   * che legge dati e vuole finire in una pagina statica comincia con la direttiva
   * "use cache" (vedi lib/api.ts); tutto il resto e' dinamico e, se la pagina e'
   * pregenerata, va messo dietro un <Suspense>.
   *
   * Il vantaggio e' che "statico" e "dinamico" diventano una scelta scritta nel
   * codice, invece di un effetto collaterale di quale funzione si e' chiamata.
   */
  cacheComponents: true,

  /*
   * Precarica solo la parte statica dei link visibili: la navigazione sembra
   * istantanea senza scaricare in anticipo tutti i dati di tutte le pagine.
   */
  partialPrefetching: true,

  /*
   * Da dove next/image puo' scaricare le immagini da ottimizzare.
   *
   * Nel nostro seed imageUrl e' null, ma dall'area di amministrazione si puo'
   * incollare qualunque indirizzo, quindi qui accettiamo qualsiasi host https.
   * In produzione si fa l'opposto: si elencano gli host di cui ci si fida, perche'
   * ogni host in elenco puo' far lavorare (e pagare) il vostro ottimizzatore.
   */
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
