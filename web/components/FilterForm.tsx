import Link from 'next/link'
import { Search } from 'lucide-react'
import type { Category, ProductFilters } from '@/lib/api'

const CAMPO =
  'h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * I filtri, senza una riga di JavaScript.
 *
 * Nel frontend React questo pannello e' uno stato del componente tenuto in sincronia
 * con useSearchParams. Qui e' un <form method="get">: il browser compone la query
 * string da solo, il server riceve ?search=...&category=... e risponde con l'HTML
 * giusto. Funziona con JavaScript disattivato, funziona dentro un crawler, e si
 * puo' copiare e incollare come link.
 *
 * Il prezzo da pagare: i campi vuoti finiscono comunque nell'URL (?search=&brand=).
 * Il backend li ignora, ma per i motori di ricerca sono indirizzi diversi che
 * mostrano la stessa pagina. Per questo la pagina filtrata dichiara noindex e un
 * canonical che punta al catalogo pulito (vedi app/page.tsx).
 */
export function FilterForm({
  categorie,
  valori,
}: {
  categorie: Category[]
  valori: ProductFilters
}) {
  return (
    <form method="get" action="/" className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="mb-1 block text-sm font-medium">
            Cerca
          </label>
          <input
            id="search"
            name="search"
            type="search"
            className={CAMPO}
            placeholder="nome, descrizione o marca"
            defaultValue={valori.search ?? ''}
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium">
            Categoria
          </label>
          <select id="category" name="category" className={CAMPO} defaultValue={valori.category ?? ''}>
            <option value="">Tutte le categorie</option>
            {categorie.map((categoria) => (
              <option key={categoria.id} value={categoria.name}>
                {categoria.name} ({categoria.productCount})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="minPrice" className="mb-1 block text-sm font-medium">
              Da (&euro;)
            </label>
            <input
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              step="1"
              className={CAMPO}
              defaultValue={valori.minPrice ?? ''}
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="mb-1 block text-sm font-medium">
              A (&euro;)
            </label>
            <input
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              step="1"
              className={CAMPO}
              defaultValue={valori.maxPrice ?? ''}
            />
          </div>
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block text-sm font-medium">
            Ordina per
          </label>
          <select id="sort" name="sort" className={CAMPO} defaultValue={valori.sort ?? 'name'}>
            <option value="name">Nome</option>
            <option value="price">Prezzo</option>
            <option value="stock">Disponibilit&agrave;</option>
            <option value="createdAt">Novit&agrave;</option>
          </select>
        </div>
        <div>
          <label htmlFor="order" className="mb-1 block text-sm font-medium">
            Direzione
          </label>
          <select id="order" name="order" className={CAMPO} defaultValue={valori.order ?? 'asc'}>
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Search className="size-4" aria-hidden="true" />
            Applica i filtri
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent"
          >
            Azzera
          </Link>
        </div>
      </div>
    </form>
  )
}
