'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/format'
import {
  clearCartAction,
  removeCartItemAction,
  updateCartItemAction,
} from '@/server/actions/cart'
import { placeOrderAction, type OrderFormState } from '@/server/actions/orders'
import type { Cart } from '@/server/cart'

const EMPTY: OrderFormState = {}

export function CartView({ cart }: { cart: Cart }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [orderState, submitOrder, orderPending] = useActionState(placeOrderAction, EMPTY)

  const run = (action: () => Promise<{ error?: string }>, successMessage?: string) => {
    startTransition(async () => {
      const result = await action()
      if (result.error) toast.error(result.error)
      else {
        if (successMessage) toast.success(successMessage)
        router.refresh()
      }
    })
  }

  // Ordine inviato: il carrello e' stato svuotato dalla transazione
  if (orderState.order) {
    const { order } = orderState
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ordine #{order.id} accettato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            Ordine accettato in modalità dimostrativa. Nessun pagamento è stato eseguito.
          </p>
          <ul className="space-y-1 text-sm">
            {order.items.map((item) => (
              <li key={item.productName} className="flex justify-between">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span>{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Totale</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Intestatario {order.cardholder}, carta •••• {order.lastFour}
          </p>
          <Button onClick={() => router.push('/')}>Torna al catalogo</Button>
        </CardContent>
      </Card>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Il carrello è vuoto.</p>
        <Button className="mt-4" onClick={() => router.push('/')}>
          Vai al catalogo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Articolo</TableHead>
              <TableHead className="text-right">Prezzo</TableHead>
              <TableHead className="text-center">Quantità</TableHead>
              <TableHead className="text-right">Subtotale</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product.name}</TableCell>
                <TableCell className="text-right">{formatPrice(item.product.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      title="Diminuisci"
                      disabled={pending || item.quantity <= 1}
                      onClick={() =>
                        run(() => updateCartItemAction(item.product.id, item.quantity - 1))
                      }
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Aumenta"
                      disabled={pending}
                      onClick={() =>
                        run(() => updateCartItemAction(item.product.id, item.quantity + 1))
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatPrice(item.subtotal)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rimuovi"
                    disabled={pending}
                    onClick={() =>
                      run(() => removeCartItemAction(item.product.id), 'Articolo rimosso')
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(clearCartAction, 'Carrello svuotato')}
        >
          Svuota carrello
        </Button>
        <span className="text-lg font-bold">Totale: {formatPrice(cart.total)}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamento dimostrativo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitOrder} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cardholder">Intestatario</Label>
                <Input id="cardholder" name="cardholder" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastFour">Ultime 4 cifre</Label>
                <Input id="lastFour" name="lastFour" inputMode="numeric" maxLength={4} required />
              </div>
            </div>
            {orderState.error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {orderState.error}
              </p>
            )}
            <Button type="submit" disabled={orderPending}>
              {orderPending ? 'Invio ordine...' : 'Invia ordine dimostrativo'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
