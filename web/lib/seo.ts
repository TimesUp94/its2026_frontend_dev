/**
 * Tutto quello che serve ai motori di ricerca, in un posto solo.
 *
 * Due cose diverse, da non confondere:
 *  - i META TAG (title, description, canonical, Open Graph): servono a chi legge
 *    il risultato di ricerca o l'anteprima su WhatsApp. Li produce generateMetadata().
 *  - i DATI STRUTTURATI (JSON-LD): servono alla macchina. Dicono "questa pagina
 *    descrive un prodotto, che costa 1899 euro e che e' disponibile". Sono quelli
 *    che possono far comparire il prezzo direttamente nei risultati di Google.
 */
import type { Product } from '@/lib/api'
import { productSlug, categorySlug } from '@/lib/slug'
import { troncaDescrizione } from '@/lib/format'

/**
 * L'indirizzo pubblico del sito. Serve assoluto: un URL canonico o un'immagine
 * Open Graph relativa non vuol dire niente per un crawler o per WhatsApp.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')

export const SITE_NAME = 'minicommerce'
export const SITE_DESCRIPTION =
  'Portatili, monitor, tastiere e accessori per chi lavora e studia al computer. ' +
  'Schede chiare, prezzi aggiornati, nessuna sorpresa al carrello.'

export function absoluteUrl(percorso: string): string {
  return `${SITE_URL}${percorso.startsWith('/') ? percorso : `/${percorso}`}`
}

export function productPath(prodotto: Pick<Product, 'id' | 'name'>): string {
  return `/prodotti/${productSlug(prodotto)}`
}

export function categoryPath(nome: string): string {
  return `/categorie/${categorySlug({ name: nome })}`
}

/** Chi siamo, in forma leggibile da una macchina. Va messo una volta sola, nel layout. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: absoluteUrl('/hero.png'),
    areaServed: 'IT',
    currenciesAccepted: 'EUR',
  }
}

/** Il sito con la sua ricerca interna: dice a Google come cercare dentro di noi. */
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'it-IT',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * La scheda prodotto. Niente recensioni e niente stelline inventate: i dati
 * strutturati devono dire la verita' su quello che c'e' nella pagina, altrimenti
 * Google li ignora (e nei casi peggiori declassa il sito).
 */
export function productJsonLd(prodotto: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prodotto.name,
    description: troncaDescrizione(prodotto.description, 300),
    sku: `MC-${prodotto.id}`,
    category: prodotto.category,
    url: absoluteUrl(productPath(prodotto)),
    ...(prodotto.brand ? { brand: { '@type': 'Brand', name: prodotto.brand } } : {}),
    ...(prodotto.imageUrl ? { image: [prodotto.imageUrl] } : {}),
    offers: {
      '@type': 'Offer',
      price: prodotto.price.toFixed(2),
      priceCurrency: 'EUR',
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        prodotto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(productPath(prodotto)),
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  }
}

/** Le briciole di pane: compaiono anche nel risultato di ricerca, al posto dell'URL. */
export function breadcrumbJsonLd(voci: Array<{ nome: string; percorso: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: voci.map((voce, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: voce.nome,
      item: absoluteUrl(voce.percorso),
    })),
  }
}

/** Un elenco di prodotti (pagina di categoria): l'ordine conta. */
export function itemListJsonLd(prodotti: Product[], nome: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nome,
    numberOfItems: prodotti.length,
    itemListElement: prodotti.map((prodotto, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      url: absoluteUrl(productPath(prodotto)),
      name: prodotto.name,
    })),
  }
}
