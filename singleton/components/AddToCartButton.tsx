'use client'

import { ShoppingCart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { addToCartAction } from '@/server/actions/cart'

/**
 * Chiama direttamente la Server Action: niente fetch, niente endpoint REST.
 * Il carrello appartiene ai clienti, quindi admin e ospiti vedono altro.
 */
export function AddToCartButton({
  productId,
  disabled,
  canBuy,
  isLoggedIn,
}: {
  productId: number
  disabled?: boolean
  canBuy: boolean
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (!canBuy) {
    return (
      <Button
        variant="outline"
        className="w-full"
        disabled={isLoggedIn}
        onClick={() => router.push('/login')}
      >
        {isLoggedIn ? 'Solo per account cliente' : 'Accedi per acquistare'}
      </Button>
    )
  }

  const handleClick = () => {
    startTransition(async () => {
      const result = await addToCartAction(productId, 1)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Articolo aggiunto al carrello')
        router.refresh()
      }
    })
  }

  return (
    <Button className="w-full" disabled={disabled || pending} onClick={handleClick}>
      <ShoppingCart className="size-4" />
      {pending ? 'Aggiunta...' : 'Aggiungi al carrello'}
    </Button>
  )
}
