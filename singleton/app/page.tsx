import { PackageX } from 'lucide-react'
import { CatalogFilters } from '@/components/CatalogFilters'
import { ProductCard } from '@/components/ProductCard'
import { getSession } from '@/lib/session'
import { listCategories, listProducts } from '@/server/catalog'

/**
 * Catalogo. I filtri vivono nella query string, quindi la pagina e' ancora un
 * Server Component: a ogni cambio di filtro Next rigenera l'elenco sul server
 * interrogando SQLite, e il risultato e' condivisibile con un link.
 */
export default async function CatalogPage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const single = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const search = single(params.search) ?? ''
  const category = single(params.category) ?? ''
  const minPrice = single(params.minPrice) ?? ''
  const maxPrice = single(params.maxPrice) ?? ''
  const sort = single(params.sort) ?? 'name'
  const order = single(params.order) === 'desc' ? 'desc' : 'asc'

  const [session, categories] = [await getSession(), listCategories()]
  const products = listProducts({
    search,
    category,
    minPrice: minPrice === '' ? undefined : Number(minPrice),
    maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
    sort,
    order,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Catalogo articoli</h1>
        <p className="text-muted-foreground">
          PC, periferiche, smartphone e accessori informatici.
        </p>
      </div>

      <CatalogFilters
        categories={categories}
        values={{ search, category, minPrice, maxPrice, sort, order }}
      />

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <PackageX className="size-8" />
          <p>Nessun articolo trovato con i filtri selezionati.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canBuy={Boolean(session && !session.isAdmin)}
              isLoggedIn={Boolean(session)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
