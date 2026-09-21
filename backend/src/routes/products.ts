import { and, asc, desc, eq, gte, like, lte, or, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.ts';
import { categories, products } from '../db/schema.ts';
import { requireAdmin } from '../middleware/auth.ts';

export const productsRouter = Router();

/**
 * Proiezione comune: oltre a categoryId espone anche il nome della categoria,
 * così i client hanno l'etichetta senza dover fare una seconda chiamata.
 */
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
};

function selectProducts() {
  return db
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id));
}

const SORTABLE_COLUMNS = {
  name: products.name,
  price: products.price,
  stock: products.stock,
  category: categories.name,
  createdAt: products.createdAt,
} as const;

// GET /api/products?search=&category=&categoryId=&brand=&minPrice=&maxPrice=&sort=price&order=desc
productsRouter.get('/', (req, res) => {
  const { search, category, categoryId, brand, minPrice, maxPrice, sort, order } = req.query;

  const filters: SQL[] = [];

  if (typeof search === 'string' && search.trim() !== '') {
    const pattern = `%${search.trim()}%`;
    filters.push(
      or(
        like(products.name, pattern),
        like(products.description, pattern),
        like(products.brand, pattern),
      )!,
    );
  }
  // La categoria si può filtrare per id oppure per nome
  const categoryIdNumber = Number(categoryId);
  if (typeof categoryId === 'string' && categoryId !== '' && Number.isInteger(categoryIdNumber)) {
    filters.push(eq(products.categoryId, categoryIdNumber));
  } else if (typeof category === 'string' && category !== '') {
    filters.push(eq(categories.name, category));
  }
  if (typeof brand === 'string' && brand !== '') {
    filters.push(eq(products.brand, brand));
  }
  const min = Number(minPrice);
  if (typeof minPrice === 'string' && minPrice !== '' && !Number.isNaN(min)) {
    filters.push(gte(products.price, min));
  }
  const max = Number(maxPrice);
  if (typeof maxPrice === 'string' && maxPrice !== '' && !Number.isNaN(max)) {
    filters.push(lte(products.price, max));
  }

  const sortColumn = SORTABLE_COLUMNS[sort as keyof typeof SORTABLE_COLUMNS] ?? products.name;
  const direction = order === 'desc' ? desc : asc;

  const rows = selectProducts()
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(direction(sortColumn))
    .all();

  res.json(rows);
});

// GET /api/products/categories — elenco dei soli nomi (vedi anche GET /api/categories)
productsRouter.get('/categories', (_req, res) => {
  const rows = db
    .select({ name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name))
    .all();
  res.json(rows.map((r) => r.name));
});

productsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id non valido' });
  }
  const product = selectProducts().where(eq(products.id, id)).get();
  if (!product) {
    return res.status(404).json({ error: 'Prodotto non trovato' });
  }
  res.json(product);
});

interface ProductBody {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  categoryId?: unknown;
  brand?: unknown;
  price?: unknown;
  stock?: unknown;
  imageUrl?: unknown;
}

/**
 * Accetta categoryId (preferito) oppure il nome della categoria, e verifica
 * che esista davvero: la categoria non viene creata implicitamente.
 */
function resolveCategoryId(body: ProductBody): { id: number | null; error: string | null } {
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
    const id = Number(body.categoryId);
    if (!Number.isInteger(id)) {
      return { id: null, error: 'categoryId deve essere un numero intero' };
    }
    const found = db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).get();
    return found
      ? { id: found.id, error: null }
      : { id: null, error: `Nessuna categoria con id ${id}` };
  }

  if (typeof body.category === 'string' && body.category.trim() !== '') {
    const name = body.category.trim();
    const found = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, name))
      .get();
    if (found) return { id: found.id, error: null };
    const available = db
      .select({ name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name))
      .all()
      .map((c) => c.name);
    return {
      id: null,
      error: `La categoria "${name}" non esiste. Categorie disponibili: ${available.join(', ')}`,
    };
  }

  return { id: null, error: 'La categoria è obbligatoria (categoryId oppure category)' };
}

function validateProduct(body: ProductBody) {
  const errors: string[] = [];
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push('Il nome è obbligatorio');
  }
  const { id: categoryId, error: categoryError } = resolveCategoryId(body);
  if (categoryError) {
    errors.push(categoryError);
  }
  const price = Number(body.price);
  if (Number.isNaN(price) || price < 0) {
    errors.push('Il prezzo deve essere un numero maggiore o uguale a 0');
  }
  const stock = body.stock === undefined || body.stock === '' ? 0 : Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.push('La disponibilità deve essere un intero maggiore o uguale a 0');
  }
  if (errors.length > 0 || categoryId === null) {
    return { errors: errors.length > 0 ? errors : ['Categoria non valida'], data: null };
  }
  return {
    errors: null,
    data: {
      name: (body.name as string).trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      categoryId,
      brand: typeof body.brand === 'string' ? body.brand.trim() : '',
      price,
      stock,
      imageUrl:
        typeof body.imageUrl === 'string' && body.imageUrl.trim() !== ''
          ? body.imageUrl.trim()
          : null,
    },
  };
}

productsRouter.post('/', requireAdmin, (req, res) => {
  const { errors, data } = validateProduct(req.body ?? {});
  if (errors) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  const inserted = db.insert(products).values(data).returning({ id: products.id }).get();
  res.status(201).json(selectProducts().where(eq(products.id, inserted.id)).get());
});

productsRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id non valido' });
  }
  const { errors, data } = validateProduct(req.body ?? {});
  if (errors) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  const updated = db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning({ id: products.id })
    .get();
  if (!updated) {
    return res.status(404).json({ error: 'Prodotto non trovato' });
  }
  res.json(selectProducts().where(eq(products.id, id)).get());
});

productsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id non valido' });
  }
  const deleted = db.delete(products).where(eq(products.id, id)).returning().get();
  if (!deleted) {
    return res.status(404).json({ error: 'Prodotto non trovato' });
  }
  res.status(204).end();
});
