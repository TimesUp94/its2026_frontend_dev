import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getCategories } from '@/lib/api'
import { categoryPath } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'

/**
 * L'indice delle categorie: pagina completamente statica, nessun parametro.
 * Serve agli utenti, ma soprattutto e' lo snodo che porta il crawler dalle pagine
 * generiche a quelle specifiche in due soli clic.
 */

export const metadata: Metadata = {
  title: 'Categorie',
  description:
    'Tutte le categorie del catalogo minicommerce: portatili, desktop, monitor, ' +
    'tastiere, mouse, smartphone e accessori.',
  alternates: { canonical: '/categorie' },
}

export default async function CategoriesPage() {
  const categorie = await getCategories()

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: 'Categorie', percorso: '/categorie' },
        ]}
      />

      <h1 className="text-3xl font-bold tracking-tight">Categorie</h1>
      <p className="max-w-2xl text-muted-foreground">
        Ogni categoria ha la sua pagina, con il suo indirizzo e il suo titolo: e&apos; cosi&apos;
        che un sito si fa trovare per &quot;monitor per ufficio&quot; e non solo per il proprio nome.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorie.map((categoria) => (
          <li key={categoria.id}>
            <Link
              href={categoryPath(categoria.name)}
              className="flex h-full flex-col gap-2 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <span className="flex items-center justify-between font-semibold">
                {categoria.name}
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="text-sm text-muted-foreground">{categoria.description}</span>
              <span className="mt-auto pt-2 text-xs text-muted-foreground">
                {categoria.productCount}{' '}
                {categoria.productCount === 1 ? 'articolo' : 'articoli'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
