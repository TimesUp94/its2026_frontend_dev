'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { cartItems, orderItems, orders, products } from '@/lib/db/schema'
import { AuthError, requireCustomer } from '@/lib/session'

export interface OrderFormState {
  error?: string
  order?: {
    id: number
    total: number
    cardholder: string
    lastFour: string
    items: Array<{ productName: string; unitPrice: number; quantity: number }>
  }
}

/**
 * Checkout dimostrativo: nessun pagamento reale, si registra solo l'ordine
 * e si svuota il carrello, dentro un'unica transazione.
 */
export async function placeOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const cardholder = String(formData.get('cardholder') ?? '').trim()
  const lastFour = String(formData.get('lastFour') ?? '').trim()
  if (!cardholder || !lastFour) {
    return { error: 'Inserisci i dati richiesti per il pagamento dimostrativo' }
  }

  let userId: number
  try {
    userId = (await requireCustomer()).userId
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message }
    throw err
  }

  const items = db
    .select({
      productId: products.id,
      productName: products.name,
      unitPrice: products.price,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .all()
  if (items.length === 0) {
    return { error: 'Il carrello è vuoto' }
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const inserted = db.transaction((tx) => {
    const order = tx
      .insert(orders)
      .values({
        userId,
        total,
        paymentMethod: 'mock-card',
        paymentCardholder: cardholder,
        paymentLastFour: lastFour.slice(-4),
      })
      .returning({ id: orders.id })
      .get()
    tx.insert(orderItems)
      .values(items.map((item) => ({ ...item, orderId: order.id })))
      .run()
    tx.delete(cartItems).where(eq(cartItems.userId, userId)).run()
    return order
  })

  revalidatePath('/carrello')
  revalidatePath('/', 'layout')
  return {
    order: {
      id: inserted.id,
      total,
      cardholder,
      lastFour: lastFour.slice(-4),
      items: items.map(({ productName, unitPrice, quantity }) => ({
        productName,
        unitPrice,
        quantity,
      })),
    },
  }
}
