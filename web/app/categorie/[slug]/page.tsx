import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getProductsByCategory } from '@/lib/api'
import { categorySlug } from '@/lib/slug'
import { categoryPath, itemListJsonLd } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ProductGrid } from '@/components/ProductGrid'
import { StructuredData } from '@/components/StructuredData'

/**
 * LA PAGINA DI CATEGORIA: statica come la scheda prodotto.
 *
 * E' la stessa lista che nella SPA si ottiene con ?category=Monitor, ma qui ha un
 * indirizzo tutto suo (/categorie/monitor), un titolo tutto suo e un testo di
 * presentazione. Sono le pagine che si posizionano sulle ricerche generiche
 * ("monitor per ufficio"), dove le schede dei singoli articoli non arrivano.
 */

/** Dallo slug al nome vero: la categoria la conosce solo il backend. */
async function trovaCategoria(slug: string) {
  const categorie = await getCategories()
  return categorie.find((categoria) => categorySlug(categoria) === slug) ?? null
}

export async function generateStaticParams() {
  const categorie = await getCategories()
  return categorie.map((categoria) => ({ slug: categorySlug(categoria) }))
}

export async function generateMetadata({
  params,
}: PageProps<'/categorie/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const categoria = await trovaCategoria(slug)

  if (!categoria) {
    return { title: 'Categoria non trovata', robots: { index: false, follow: false } }
  }

  return {
    title: categoria.name,
    description: `${categoria.description}. ${categoria.productCount} articoli disponibili su minicommerce, con prezzi e disponibilita' aggiornati.`,
    alternates: { canonical: categoryPath(categoria.name) },
    openGraph: {
      type: 'website',
      title: `${categoria.name} | minicommerce`,
      description: categoria.description,
      url: categoryPath(categoria.name),
    },
  }
}

export default async function CategoryPage({ params }: PageProps<'/categorie/[slug]'>) {
  const { slug } = await params
  const categoria = await trovaCategoria(slug)
  if (!categoria) notFound()

  const prodotti = await getProductsByCategory(categoria.name)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <StructuredData data={itemListJsonLd(prodotti, categoria.name)} />

      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: 'Categorie', percorso: '/categorie' },
          { nome: categoria.name, percorso: categoryPath(categoria.name) },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{categoria.name}</h1>
        <p className="max-w-2xl text-muted-foreground">{categoria.description}</p>
        <p className="text-sm text-muted-foreground">
          {prodotti.length} {prodotti.length === 1 ? 'articolo' : 'articoli'} in questa categoria
        </p>
      </header>

      {prodotti.length > 0 ? (
        <ProductGrid prodotti={prodotti} />
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Questa categoria e&apos; ancora vuota.
        </p>
      )}
    </main>
  )
}
