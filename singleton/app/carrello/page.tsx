import { redirect } from 'next/navigation'
import { CartView } from '@/components/CartView'
import { getSession } from '@/lib/session'
import { getCart } from '@/server/cart'

export const metadata = { title: 'Carrello · minicommerce' }

export default async function CartPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Il carrello è disponibile per gli account cliente.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Il tuo carrello</h1>
      <CartView cart={getCart(session.userId)} />
    </div>
  )
}
