import type { MetadataRoute } from 'next'
import { absoluteUrl, SITE_URL } from '@/lib/seo'

/**
 * robots.txt, generato da codice.
 *
 * Due cose sole, ma importanti:
 *  - dove sta la sitemap, cosi' il crawler non deve indovinare;
 *  - cosa NON vale la pena leggere: /api/ sono le nostre rotte di servizio.
 *
 * Attenzione a un equivoco frequente: "disallow" non nasconde niente e non protegge
 * niente. Dice solo "non perdere tempo qui". Se una pagina deve restare fuori
 * dall'indice si usa noindex nei metadati (vedi app/page.tsx), e se deve restare
 * privata ci vuole un controllo di autenticazione sul server.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
