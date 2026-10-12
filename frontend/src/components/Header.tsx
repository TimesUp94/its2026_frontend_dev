import { Cpu, LogOut, ShoppingCart } from 'lucide-react'
import { startTransition, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { CART_UPDATED_EVENT, fetchCart } from '@/lib/api'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    if (!user || user.isAdmin) return
    const updateCount = () => {
      fetchCart()
        .then((cart) => setCartCount(cart.items.reduce((count, item) => count + item.quantity, 0)))
        .catch(() => setCartCount(0))
    }
    updateCount()
    window.addEventListener(CART_UPDATED_EVENT, updateCount)
    return () => window.removeEventListener(CART_UPDATED_EVENT, updateCount)
  }, [user])

  const handleLogout = () => {
    // logout e navigazione nella stessa transition: evita il render intermedio
    // di AdminPage senza utente, che reindirizzerebbe a /login
    startTransition(() => {
      logout()
      navigate('/')
    })
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <Cpu className="size-5" />
          minicommerce
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Catalogo</Link>
          </Button>
          {user?.isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
              {/* <a href="/admin">Admin</a> */}
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to="/about">About</Link>
          </Button>
          {user && !user.isAdmin ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/cart" aria-label={`Carrello, ${cartCount} articoli`}>
                <ShoppingCart className="size-4" />
                Carrello{cartCount > 0 ? ` (${cartCount})` : ''}
              </Link>
            </Button>
          ) : !user ? (
            <Button asChild variant="outline" size="sm"><Link to="/login">Accedi</Link></Button>
          ) : null}
          {user && (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" />
                Esci
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
