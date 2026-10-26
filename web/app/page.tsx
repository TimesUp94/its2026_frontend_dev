import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories, searchProducts, type ProductFilters } from '@/lib/api'
import { FilterForm } from '@/components/FilterForm'
import { ProductGrid, ProductGridSkeleton } from '@/components/ProductGrid'
import { categoryPath, SITE_DESCRIPTION } from '@/lib/seo'

/**
 * IL CATALOGO: la pagina dinamica del sito.
 *
 * Dipende dalla query string (?search=&category=...), quindi non si puo' pregenerare:
 * esiste una pagina diversa per ogni combinazione di filtri. Next la rende a ogni
 * richiesta (SSR) e nell'elenco di "next build" la trovate marcata con la f corsiva.
 * Le schede prodotto, invece, sono pregenerate: quelle sono il contenuto che deve
 * finire su Google.
 *
 * Il guscio della pagina (titolo e testo) non aspetta l'API: dentro <Suspense> va
 * solo la parte che dipende dai filtri, e il browser riceve subito il resto.
 */

/** I parametri arrivano sempre come stringhe (o array, se ripetuti). Normalizziamoli. */
function leggiFiltri(parametri: Record<string, string | string[] | undefined>): ProductFilters {
  const uno = (chiave: string): string | undefined => {
    const valore = parametri[chiave]
    const testo = Array.isArray(valore) ? valore[0] : valore
    return typeof testo === 'string' && testo.trim() !== '' ? testo.trim() : undefined
  }
  return {
    search: uno('search'),
    category: uno('category'),
    minPrice: uno('minPrice'),
    maxPrice: uno('maxPrice'),
    sort: uno('sort'),
    order: uno('order'),
  }
}

function contaFiltri(filtri: ProductFilters): number {
  return Object.values(filtri).filter((valore) => valore !== undefined).length
}

/**
 * Il catalogo filtrato dichiara noindex.
 *
 * Non e' pigrizia: ?search=mouse&minPrice=10&order=desc e le sue infinite varianti
 * mostrano pezzi della stessa lista. Lasciarle indicizzare significa far spendere al
 * crawler il suo tempo su migliaia di doppioni invece che sulle schede prodotto.
 * "follow" resta attivo: i link dentro la pagina vanno seguiti, le pagine no.
 */
export async function generateMetadata({ searchParams }: PageProps<'/'>): Promise<Metadata> {
  const filtri = leggiFiltri(await searchParams)

  if (contaFiltri(filtri) === 0) {
    return {
      title: { absolute: 'minicommerce - informatica e accessori per studio e lavoro' },
      description: SITE_DESCRIPTION,
      alternates: { canonical: '/' },
    }
  }

  const pezzi = [
    filtri.search ? `"${filtri.search}"` : null,
    filtri.category,
    filtri.minPrice ? `da ${filtri.minPrice} euro` : null,
    filtri.maxPrice ? `fino a ${filtri.maxPrice} euro` : null,
  ].filter(Boolean)

  return {
    title: `Ricerca: ${pezzi.join(', ')}`,
    description: SITE_DESCRIPTION,
    alternates: { canonical: '/' },
    robots: { index: false, follow: true },
  }
}

export default async function CatalogPage({ searchParams }: PageProps<'/'>) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Informatica e accessori, con le schede scritte bene
        </h1>
        <p className="max-w-2xl text-muted-foreground">{SITE_DESCRIPTION}</p>
      </section>

      <Suspense fallback={<SchermataInCaricamento />}>
        <CatalogResults searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

/** Tutto cio' che dipende dalla query string sta qui dentro, dietro il <Suspense>. */
async function CatalogResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filtri = leggiFiltri(await searchParams)
  const [categorie, prodotti] = await Promise.all([getCategories(), searchProducts(filtri)])

  return (
    <section className="space-y-6" aria-label="Catalogo">
      <FilterForm categorie={categorie} valori={filtri} />

      <p className="text-sm text-muted-foreground" role="status">
        {prodotti.length === 0
          ? 'Nessun articolo trovato'
          : `${prodotti.length} ${prodotti.length === 1 ? 'articolo' : 'articoli'}`}
        {contaFiltri(filtri) > 0 ? ' con i filtri scelti' : ' in catalogo'}
      </p>

      {prodotti.length > 0 ? (
        <ProductGrid prodotti={prodotti} />
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Non abbiamo trovato niente con questi filtri.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Provate con meno vincoli, oppure ripartite dal{' '}
            <Link href="/" className="underline">
              catalogo completo
            </Link>
            .
          </p>
        </div>
      )}

      <nav aria-label="Vai a una categoria" className="flex flex-wrap gap-2 border-t pt-6">
        {categorie.map((categoria) => (
          <Link
            key={categoria.id}
            href={categoryPath(categoria.name)}
            className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
          >
            {categoria.name}
          </Link>
        ))}
      </nav>
    </section>
  )
}

function SchermataInCaricamento() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-xl border bg-card" />
      <ProductGridSkeleton />
    </div>
  )
}
