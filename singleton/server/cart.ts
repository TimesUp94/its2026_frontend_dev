import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cartItems, categories, products } from '@/lib/db/schema'
import type { ProductRow } from './catalog.ts'

export interface CartLine {
  id: number
  quantity: number
  product: ProductRow
  subtotal: number
}

export interface Cart {
  items: CartLine[]
  total: number
}

/** Il carrello dell'utente, con il prodotto completo per ogni riga. */
export function getCart(userId: number): Cart {
  const rows = db
    .select({
      cartItemId: cartItems.id,
      quantity: cartItems.quantity,
      product: {
        id: products.id,
        name: products.name,
        description: products.description,
        categoryId: products.categoryId,
        category: categories.name,
        brand: products.brand,
        price: products.price,
        stock: products.stock,
        imageUrl: products.imageUrl,
        createdAt: products.createdAt,
      },
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(cartItems.userId, userId))
    .all()

  const items = rows.map((row) => ({
    id: row.cartItemId,
    quantity: row.quantity,
    product: row.product,
    subtotal: row.product.price * row.quantity,
  }))
  return { items, total: items.reduce((sum, item) => sum + item.subtotal, 0) }
}

/** Numero di pezzi nel carrello, per il contatore nell'intestazione. */
export function countCartItems(userId: number): number {
  return getCart(userId).items.reduce((sum, item) => sum + item.quantity, 0)
}
