'use server'

import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { categories, products } from '@/lib/db/schema'
import { AuthError, requireAdmin } from '@/lib/session'

export interface ProductFormState {
  error?: string
  success?: string
}

interface ParsedProduct {
  name: string
  description: string
  categoryId: number
  brand: string
  price: number
  stock: number
  imageUrl: string | null
}

/**
 * Validazione identica a quella dell'API REST: la categoria non viene mai
 * creata implicitamente, deve esistere gia' a database.
 */
function parseProduct(formData: FormData): { data?: ParsedProduct; error?: string } {
  const errors: string[] = []

  const name = String(formData.get('name') ?? '').trim()
  if (!name) errors.push('Il nome è obbligatorio')

  const rawCategoryId = String(formData.get('categoryId') ?? '').trim()
  const categoryId = Number(rawCategoryId)
  if (rawCategoryId === '' || !Number.isInteger(categoryId)) {
    errors.push('La categoria è obbligatoria')
  } else if (
    !db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).get()
  ) {
    const available = db
      .select({ name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name))
      .all()
      .map((c) => c.name)
    errors.push(`Nessuna categoria con id ${categoryId}. Disponibili: ${available.join(', ')}`)
  }

  const price = Number(String(formData.get('price') ?? '').replace(',', '.'))
  if (Number.isNaN(price) || price < 0) {
    errors.push('Il prezzo deve essere un numero maggiore o uguale a 0')
  }

  const rawStock = String(formData.get('stock') ?? '').trim()
  const stock = rawStock === '' ? 0 : Number(rawStock)
  if (!Number.isInteger(stock) || stock < 0) {
    errors.push('La disponibilità deve essere un intero maggiore o uguale a 0')
  }

  if (errors.length > 0) return { error: errors.join('; ') }

  const imageUrl = String(formData.get('imageUrl') ?? '').trim()
  return {
    data: {
      name,
      description: String(formData.get('description') ?? '').trim(),
      categoryId,
      brand: String(formData.get('brand') ?? '').trim(),
      price,
      stock,
      imageUrl: imageUrl === '' ? null : imageUrl,
    },
  }
}

function refreshCatalog() {
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function saveProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message }
    throw err
  }

  const { data, error } = parseProduct(formData)
  if (error || !data) return { error }

  const rawId = String(formData.get('id') ?? '').trim()
  if (rawId === '') {
    db.insert(products).values(data).run()
    refreshCatalog()
    return { success: 'Articolo creato' }
  }

  const id = Number(rawId)
  if (!Number.isInteger(id)) return { error: 'Id non valido' }
  const updated = db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning({ id: products.id })
    .get()
  if (!updated) return { error: 'Articolo non trovato' }
  refreshCatalog()
  return { success: 'Articolo aggiornato' }
}

export async function deleteProductAction(id: number): Promise<ProductFormState> {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message }
    throw err
  }
  if (!Number.isInteger(id)) return { error: 'Id non valido' }

  const deleted = db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })
    .get()
  if (!deleted) return { error: 'Articolo non trovato' }
  refreshCatalog()
  return { success: 'Articolo eliminato' }
}
