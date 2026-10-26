import type { APIContext } from 'astro'

/*
 * robots.txt generato da codice, per non scrivere a mano un indirizzo assoluto che
 * cambia fra sviluppo e produzione: "site" lo conosce astro.config.mjs, e di qui
 * passa dentro il file.
 *
 * Un file dentro src/pages che non finisce in .astro e' una rotta: puo' restituire
 * XML (rss.xml.ts), testo (questo), JSON, qualsiasi cosa.
 */
export function GET({ site }: APIContext) {
  const righe = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${new URL('sitemap-index.xml', site)}`,
    '',
  ]

  return new Response(righe.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
