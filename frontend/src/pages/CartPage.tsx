import { ArrowLeft, LoaderCircle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchCart, formatPrice, getErrorMessage, placeMockOrder, removeCartItem, updateCartItem, type Cart, type MockOrder } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const EMPTY_CART: Cart = { items: [], total: 0 }

export function CartPage() {
  const { user } = useAuth()
  const [cart, setCart] = useState<Cart>(EMPTY_CART)
  const [loading, setLoading] = useState(true)
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<MockOrder | null>(null)
  const [cardholder, setCardholder] = useState(user?.name ?? '')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [securityCode, setSecurityCode] = useState('')

  const loadCart = useCallback(() => {
    fetchCart()
      .then(setCart)
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user && !user.isAdmin) loadCart()
  }, [user, loadCart])

  if (!user) return <Navigate to="/login" replace />
  if (user.isAdmin) return <Navigate to="/admin" replace />

  const changeQuantity = async (productId: number, quantity: number) => {
    setBusyProductId(productId)
    try {
      await updateCartItem(productId, quantity)
      loadCart()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyProductId(null)
    }
  }

  const handleRemove = async (productId: number) => {
    setBusyProductId(productId)
    try {
      await removeCartItem(productId)
      toast.success('Articolo rimosso dal carrello')
      loadCart()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyProductId(null)
    }
  }

  const handleCheckout = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const acceptedOrder = await placeMockOrder({
        paymentCardholder: cardholder,
        paymentLastFour: cardNumber.slice(-4),
      })
      setOrder(acceptedOrder)
      setCart(EMPTY_CART)
      setCheckoutOpen(false)
      setCardNumber('')
      setExpiry('')
      setSecurityCode('')
      toast.success('Ordine dimostrativo accettato')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/"><ArrowLeft aria-hidden="true" />Torna al catalogo</Link>
      </Button>

      {order ? (
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary"><ShoppingCart className="size-6" /></div>
            <CardTitle>Ordine #{order.id} accettato</CardTitle>
            <CardDescription>{order.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p><span className="text-muted-foreground">Totale ordine:</span> <strong>{formatPrice(order.total)}</strong></p>
              <p className="mt-1"><span className="text-muted-foreground">Pagamento dimostrativo:</span> Carta ···· {order.payment.lastFour}</p>
            </div>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={`${order.id}-${item.productId}`} className="flex justify-between gap-4 text-sm">
                  <span>{item.productName} <span className="text-muted-foreground">× {item.quantity}</span></span>
                  <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Button asChild className="w-full"><Link to="/">Continua gli acquisti</Link></Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
          <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p>Caricamento carrello...</p>
        </div>
      ) : cart.items.length === 0 ? (
        <Card className="mx-auto max-w-xl">
          <CardHeader className="items-center text-center">
            <ShoppingCart className="size-10 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Il carrello è vuoto</CardTitle>
            <CardDescription>Esplora il catalogo e aggiungi gli articoli che ti interessano.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild><Link to="/">Vai al catalogo</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">Il tuo carrello</h1>
            <p className="text-muted-foreground">Rivedi gli articoli prima di inviare l’ordine.</p>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-3">
              {cart.items.map(({ product, quantity, subtotal }) => (
                <Card key={product.id} className="sm:flex-row sm:items-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-32 w-full object-contain p-3 sm:w-36" />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-muted text-muted-foreground sm:h-32 sm:w-36"><ShoppingCart className="size-8" /></div>
                  )}
                  <CardContent className="grid flex-1 gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="space-y-1">
                      <Link to={`/article/${product.id}`} className="font-semibold hover:underline">{product.name}</Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{product.category}</Badge>
                        {product.brand && <span className="text-sm text-muted-foreground">{product.brand}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatPrice(product.price)} cad.</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" aria-label={`Riduci quantità di ${product.name}`} disabled={quantity <= 1 || busyProductId === product.id} onClick={() => changeQuantity(product.id, quantity - 1)}><Minus className="size-4" /></Button>
                        <span className="min-w-6 text-center" aria-label={`Quantità ${quantity}`}>{quantity}</span>
                        <Button type="button" variant="outline" size="icon" aria-label={`Aumenta quantità di ${product.name}`} disabled={busyProductId === product.id} onClick={() => changeQuantity(product.id, quantity + 1)}><Plus className="size-4" /></Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Rimuovi ${product.name}`} disabled={busyProductId === product.id} onClick={() => handleRemove(product.id)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Riepilogo</CardTitle>
                <CardDescription>{cart.items.reduce((count, item) => count + item.quantity, 0)} articoli nel carrello</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-t pt-4 font-semibold">
                  <span>Totale</span><span>{formatPrice(cart.total)}</span>
                </div>
                {!checkoutOpen ? (
                  <Button className="w-full" onClick={() => setCheckoutOpen(true)}>Procedi all’ordine</Button>
                ) : (
                  <form onSubmit={handleCheckout} className="space-y-4">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                      Pagamento simulato: non inserire dati reali. Nessun addebito verrà effettuato. Il numero completo e il codice di sicurezza non vengono inviati né salvati.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-name">Intestatario carta</Label>
                      <Input id="payment-name" autoComplete="cc-name" required value={cardholder} onChange={(event) => setCardholder(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-number">Numero carta dimostrativo</Label>
                      <Input id="payment-number" autoComplete="off" inputMode="numeric" required value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="payment-expiry">Scadenza</Label>
                        <Input id="payment-expiry" autoComplete="off" placeholder="MM/AA" required value={expiry} onChange={(event) => setExpiry(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-code">Codice sicurezza</Label>
                        <Input id="payment-code" type="password" autoComplete="off" inputMode="numeric" required value={securityCode} onChange={(event) => setSecurityCode(event.target.value)} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Invio ordine...' : `Conferma ordine · ${formatPrice(cart.total)}`}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setCheckoutOpen(false)}>Torna al riepilogo</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  )
}
