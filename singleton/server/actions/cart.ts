'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { cartItems, products } from '@/lib/db/schema'
import { AuthError, requireCustomer } from '@/lib/session'

export interface ActionResult {
  error?: string
  message?: string
}

/** Traduce gli errori di permesso in un messaggio, invece di far esplodere la pagina. */
async function withCustomer<T>(fn: (userId: number) => T): Promise<ActionResult> {
  try {
    const session = await requireCustomer()
    fn(session.userId)
    revalidatePath('/carrello')
    revalidatePath('/', 'layout')
    return {}
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message }
    throw err
  }
}

export async function addToCartAction(productId: number, quantity = 1): Promise<ActionResult> {
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Articolo e quantità non validi' }
  }
  const product = db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .get()
  if (!product) return { error: 'Articolo non trovato' }

  return withCustomer((userId) => {
    const existing = db
      .select({ id: cartItems.id, quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .get()
    if (existing) {
      db.update(cartItems)
        .set({ quantity: existing.quantity + quantity })
        .where(eq(cartItems.id, existing.id))
        .run()
    } else {
      db.insert(cartItems).values({ userId, productId, quantity }).run()
    }
  })
}

export async function updateCartItemAction(
  productId: number,
  quantity: number,
): Promise<ActionResult> {
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Articolo e quantità non validi' }
  }
  return withCustomer((userId) => {
    db.update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .run()
  })
}

export async function removeCartItemAction(productId: number): Promise<ActionResult> {
  if (!Number.isInteger(productId)) return { error: 'Id articolo non valido' }
  return withCustomer((userId) => {
    db.delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .run()
  })
}

export async function clearCartAction(): Promise<ActionResult> {
  return withCustomer((userId) => {
    db.delete(cartItems).where(eq(cartItems.userId, userId)).run()
  })
}
