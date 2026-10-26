import Link from 'next/link'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { productPath } from '@/lib/seo'
import { ProductImage } from '@/components/ProductImage'

/**
 * La card del catalogo. Nel frontend React l'equivalente apre /article/:id dentro
 * la SPA; qui ogni card e' un link vero a una pagina vera, con il suo indirizzo e
 * il suo titolo. E' questa la differenza che si vede dal motore di ricerca.
 *
 * priority serve solo alle prime card: dice al browser di non caricarle in differita,
 * perche' sono quelle che l'utente vede subito (contano per il punteggio LCP).
 */
export function ProductCard({ prodotto, priority = false }: { prodotto: Product; priority?: boolean }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={productPath(prodotto)} className="relative block aspect-4/3 bg-muted/40">
        <ProductImage
          src={prodotto.imageUrl}
          alt={prodotto.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{prodotto.category}</p>
        <h3 className="font-medium leading-snug">
          <Link href={productPath(prodotto)} className="hover:underline">
            {prodotto.name}
          </Link>
        </h3>
        {prodotto.brand ? (
          <p className="text-sm text-muted-foreground">{prodotto.brand}</p>
        ) : null}
        <div className="mt-auto flex items-baseline justify-between pt-2">
          <span className="text-lg font-semibold">{formatPrice(prodotto.price)}</span>
          <span
            className={
              prodotto.stock > 0
                ? 'rounded-full border px-2 py-0.5 text-xs text-muted-foreground'
                : 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive'
            }
          >
            {prodotto.stock > 0 ? 'Disponibile' : 'Esaurito'}
          </span>
        </div>
      </div>
    </article>
  )
}
