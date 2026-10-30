import type { MetadataRoute } from 'next'
import { getCatalog, getCategories } from '@/lib/api'
import { categorySlug, productSlug } from '@/lib/slug'
import { absoluteUrl } from '@/lib/seo'

/**
 * LA SITEMAP: l'elenco di tutti gli indirizzi del sito, in un formato che i motori
 * di ricerca leggono senza doverli scoprire a forza di link.
 *
 * Questo file si chiama sitemap.ts e Next lo serve su /sitemap.xml, generando l'XML
 * da solo. Non va scritto a mano e non va aggiornato a mano: nasce dai dati, quindi
 * ogni articolo nuovo ci finisce dentro alla prima rigenerazione.
 *
 * lastModified non e' decorativo: dice al crawler cosa ha senso riscaricare.
 * Attenzione a non metterci "adesso": se tutte le pagine risultano modificate a
 * ogni passaggio, l'informazione non vale piu' niente.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [prodotti, categorie] = await Promise.all([getCatalog(), getCategories()])

  const ultimoArticolo = prodotti
    .map((prodotto) => prodotto.createdAt)
    .sort()
    .at(-1)

  const pagineFisse: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: ultimoArticolo ? new Date(ultimoArticolo) : undefined,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/categorie'),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/chi-siamo'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const paginaCategorie: MetadataRoute.Sitemap = categorie.map((categoria) => ({
    url: absoluteUrl(`/categorie/${categorySlug(categoria)}`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const pagineProdotti: MetadataRoute.Sitemap = prodotti.map((prodotto) => ({
    url: absoluteUrl(`/prodotti/${productSlug(prodotto)}`),
    lastModified: new Date(prodotto.createdAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...pagineFisse, ...paginaCategorie, ...pagineProdotti]
}
