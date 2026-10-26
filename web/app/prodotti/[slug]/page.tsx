import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { ArrowRight, Package, Tag } from 'lucide-react'
import { APP_URL, getCacheStamp, getCatalog, getProduct } from '@/lib/api'
import { idFromSlug, productSlug } from '@/lib/slug'
import { formatDateTime, formatPrice, troncaDescrizione } from '@/lib/format'
import { categoryPath, productJsonLd, productPath } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ProductImage } from '@/components/ProductImage'
import { StructuredData } from '@/components/StructuredData'

/**
 * LA SCHEDA PRODOTTO: la pagina statica del sito, e la ragione per cui esiste
 * questa versione del progetto.
 *
 * Nella SPA /article/3 e' una pagina vuota che si riempie dopo, in JavaScript:
 * chi legge l'HTML non trova ne' il nome ne' il prezzo. Qui il nome e il prezzo
 * SONO nell'HTML, perche' Next genera queste pagine in anticipo (una per articolo,
 * elencate da generateStaticParams) e le rigenera quando i dati cambiano.
 *
 * Provate la differenza con una riga sola:
 *   curl -s http://localhost:5173/article/3 | Select-String "ThinkPad"   -> niente
 *   curl -s http://localhost:3000/prodotti/3-... | Select-String "ThinkPad" -> c'e'
 */

/**
 * L'elenco delle pagine da pregenerare. Gira durante "next build": se il backend
 * non e' avviato, qui la build si ferma. E' il patto del rendering statico, i dati
 * devono esistere prima dei visitatori.
 */
export async function generateStaticParams() {
  const prodotti = await getCatalog()
  return prodotti.map((prodotto) => ({ slug: productSlug(prodotto) }))
}

export async function generateMetadata({
  params,
}: PageProps<'/prodotti/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const id = idFromSlug(slug)
  const prodotto = id === null ? null : await getProduct(id)

  if (!prodotto) {
    return { title: 'Articolo non trovato', robots: { index: false, follow: false } }
  }

  const descrizione = troncaDescrizione(
    prodotto.description ||
      `${prodotto.name}${prodotto.brand ? ` di ${prodotto.brand}` : ''}, categoria ${prodotto.category}.`,
  )

  return {
    title: prodotto.name,
    description: descrizione,
    // Il canonical dice a Google quale indirizzo contare quando la stessa pagina
    // e' raggiungibile da piu' URL (per esempio con uno slug vecchio).
    alternates: { canonical: productPath(prodotto) },
    openGraph: {
      type: 'website',
      title: prodotto.name,
      description: descrizione,
      url: productPath(prodotto),
      // L'immagine di anteprima la genera opengraph-image.tsx, qui accanto.
    },
  }
}

export default async function ProductPage({ params }: PageProps<'/prodotti/[slug]'>) {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (id === null) notFound()

  const prodotto = await getProduct(id)
  if (!prodotto) notFound()

  /*
   * Se il nome dell'articolo cambia, il vecchio indirizzo resta in giro (nei
   * preferiti, nei link, nell'indice di Google). L'id in testa allo slug ci permette
   * di riconoscerlo e di mandare un redirect 308 verso l'indirizzo giusto: l'utente
   * arriva dove vuole e il motore di ricerca aggiorna il suo indice.
   *
   * Alla primissima richiesta di un indirizzo mai visto il guscio statico e' gia'
   * partito con 200 e il redirect viaggia dentro lo streaming; dalla seconda in poi
   * Next ha in cache l'esito e risponde con un vero 308. Il <link rel="canonical">
   * dice comunque la verita' in entrambi i casi.
   */
  const slugCanonico = productSlug(prodotto)
  if (slug !== slugCanonico) permanentRedirect(`/prodotti/${slugCanonico}`)

  const generatoIl = await getCacheStamp()

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <StructuredData data={productJsonLd(prodotto)} />

      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: prodotto.category, percorso: categoryPath(prodotto.category) },
          { nome: prodotto.name, percorso: productPath(prodotto) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative min-h-80 overflow-hidden rounded-xl border bg-muted/40 sm:min-h-[28rem]">
          <ProductImage
            src={prodotto.imageUrl}
            alt={prodotto.name}
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
          />
        </div>

        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryPath(prodotto.category)}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:opacity-90"
              >
                <Tag className="size-3" aria-hidden="true" />
                {prodotto.category}
              </Link>
              {prodotto.brand ? (
                <span className="text-sm text-muted-foreground">{prodotto.brand}</span>
              ) : null}
            </div>

            {/* Un solo h1 per pagina, e contiene la cosa di cui parla la pagina. */}
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{prodotto.name}</h1>
            <p className="text-3xl font-bold tracking-tight">{formatPrice(prodotto.price)}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium">Disponibilit&agrave;</p>
            {prodotto.stock > 0 ? (
              <p className="text-sm text-muted-foreground">
                <span className="mr-2 rounded-full border px-2 py-0.5 text-xs text-foreground">
                  Disponibile
                </span>
                {prodotto.stock} {prodotto.stock === 1 ? 'pezzo' : 'pezzi'} in magazzino
              </p>
            ) : (
              <p className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                Al momento esaurito
              </p>
            )}
          </div>

          {/*
            Il carrello non sta qui. Aggiungere al carrello vuol dire avere un utente,
            un token e uno stato: e' lavoro da applicazione, e l'applicazione e' la SPA.
            La vetrina si ferma un passo prima e passa la mano.
          */}
          <a
            href={`${APP_URL}/article/${prodotto.id}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:opacity-90"
          >
            Acquista nell&apos;applicazione
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Categoria</dt>
              <dd className="font-medium">{prodotto.category}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Marca</dt>
              <dd className="font-medium">{prodotto.brand || 'Non specificata'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Codice</dt>
              <dd className="font-mono text-xs">MC-{prodotto.id}</dd>
            </div>
          </dl>

          <section className="space-y-2 border-t pt-5" aria-labelledby="descrizione">
            <h2 id="descrizione" className="flex items-center gap-2 font-semibold">
              <Package className="size-4" aria-hidden="true" />
              Descrizione
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {prodotto.description || 'Nessuna descrizione disponibile per questo articolo.'}
            </p>
          </section>

          {/*
            La prova che una pagina statica non e' una pagina morta: questa data e'
            il momento in cui l'HTML e' stato generato, non il momento della visita.
            Ricaricate: non cambia. Invalidate l'etichetta 'prodotti' (vedi
            docs/WEB-NEXTJS.md) e cambia.
          */}
          <p className="border-t pt-4 text-xs text-muted-foreground">
            Dati in cache dal {formatDateTime(new Date(generatoIl))}
          </p>
        </div>
      </div>
    </main>
  )
}
