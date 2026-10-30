import Link from 'next/link'
import { Cpu, LogIn, ShoppingCart } from 'lucide-react'
import { APP_URL } from '@/lib/api'

/**
 * L'intestazione della vetrina.
 *
 * Non sa chi sia l'utente, e non deve saperlo: questo HTML e' lo stesso per tutti
 * e per questo si puo' mettere in cache in una CDN. Carrello, login e area admin
 * vivono nell'applicazione React, e qui ci sono solo due link che portano la'.
 * Sono <a> e non <Link>, perche' sono un altro sito: un'altra origine, un altro
 * bundle, un'altra storia.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Cpu className="size-5" aria-hidden="true" />
          minicommerce
        </Link>
        <nav aria-label="Navigazione principale" className="flex items-center gap-1 text-sm">
          <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/">
            Catalogo
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/categorie">
            Categorie
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/chi-siamo">
            Chi siamo
          </Link>
          <a
            className="ml-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent"
            href={`${APP_URL}/cart`}
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            Carrello
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
            href={`${APP_URL}/login`}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Accedi
          </a>
        </nav>
      </div>
    </header>
  )
}
