import { Cpu, LogOut, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/session'
import { logoutAction } from '@/server/actions/auth'
import { countCartItems } from '@/server/cart'

/**
 * Server Component: legge la sessione dal cookie e interroga il database
 * direttamente. Non esiste nessuna chiamata /api/auth/me da aspettare, i dati
 * sono gia' pronti quando l'HTML viene generato.
 */
export async function Header() {
  const session = await getSession()
  const cartCount = session && !session.isAdmin ? countCartItems(session.userId) : 0

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Cpu className="size-5" />
          minicommerce
        </Link>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Catalogo</Link>
          </Button>

          {session?.isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Admin</Link>
            </Button>
          )}

          {session && !session.isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/carrello" className="flex items-center gap-1.5">
                <ShoppingCart className="size-4" />
                Carrello
                {cartCount > 0 && <Badge variant="secondary">{cartCount}</Badge>}
              </Link>
            </Button>
          )}

          {session ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.email}
              </span>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="size-4" />
                  Esci
                </Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Accedi</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
