import { Cpu, LogOut } from 'lucide-react'
import { startTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">Admin</Link>
          </Button>
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
