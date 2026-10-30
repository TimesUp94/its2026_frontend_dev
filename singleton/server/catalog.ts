import 'server-only'

import { and, asc, count, desc, eq, gte, like, lte, or, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, products } from '@/lib/db/schema'

/**
 * Le query del catalogo.
 *
 * Nella versione con Express queste stesse righe stavano in
 * backend/src/routes/products.ts e venivano raggiunte via HTTP. Qui sono
 * normali funzioni: i Server Component le chiamano direttamente, senza che
 * nessuna richiesta di rete esca dal processo.
 */

export interface ProductRow {
  id: number
  name: string
  description: string
  categoryId: number
  category: string
  brand: string
  price: number
  stock: number
  imageUrl: string | null
  createdAt: string
}

export interface CategoryRow {
  id: number
  name: string
  description: string
  productCount: number
  createdAt: string
}

export interface ProductFilters {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: string
  order?: string
}

/** Stesse colonne esposte dall'API REST, nome della categoria incluso. */
const productSelection = {
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
}

const SORTABLE_COLUMNS = {
  name: products.name,
  price: products.price,
  stock: products.stock,
  category: categories.name,
  createdAt: products.createdAt,
} as const

export type SortKey = keyof typeof SORTABLE_COLUMNS

function selectProducts() {
  return db
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
}

export function listProducts(filters: ProductFilters = {}): ProductRow[] {
  const conditions: SQL[] = []

  console.log('Prendendo la lista di prodotti')
  const search = filters.search?.trim()
  if (search) {
    const pattern = `%${search}%`
    conditions.push(
      or(
        like(products.name, pattern),
        like(products.description, pattern),
        like(products.brand, pattern),
      )!,
    )
  }
  if (filters.category) {
    conditions.push(eq(categories.name, filters.category))
  }
  if (filters.minPrice !== undefined && !Number.isNaN(filters.minPrice)) {
    conditions.push(gte(products.price, filters.minPrice))
  }
  if (filters.maxPrice !== undefined && !Number.isNaN(filters.maxPrice)) {
    conditions.push(lte(products.price, filters.maxPrice))
  }

  const sortColumn = SORTABLE_COLUMNS[filters.sort as SortKey] ?? products.name
  const direction = filters.order === 'desc' ? desc : asc

  return selectProducts()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(direction(sortColumn))
    .all()
}

export function getProduct(id: number): ProductRow | undefined {
  if (!Number.isInteger(id)) return undefined
  return selectProducts().where(eq(products.id, id)).get()
}

export function listCategories(): CategoryRow[] {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      createdAt: categories.createdAt,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name))
    .all()
}
