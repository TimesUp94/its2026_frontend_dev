import type { Product } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'

export function ProductGrid({ prodotti }: { prodotti: Product[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prodotti.map((prodotto, indice) => (
        <li key={prodotto.id}>
          <ProductCard prodotto={prodotto} priority={indice < 3} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Lo scheletro che si vede mentre la parte dinamica arriva. Con <Suspense> il
 * server manda subito l'HTML statico (intestazione, titolo, questo scheletro) e
 * spedisce i risultati dopo, nella stessa risposta: si chiama streaming.
 */
export function ProductGridSkeleton({ quante = 6 }: { quante?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: quante }, (_, indice) => (
        <li key={indice} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-4/3 animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  )
}
