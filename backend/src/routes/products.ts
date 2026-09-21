import { and, asc, desc, eq, gte, like, lte, or, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.ts';
import { products } from '../db/schema.ts';
import { requireAdmin } from '../middleware/auth.ts';

export const productsRouter = Router();

const SORTABLE_COLUMNS = {
  name: products.name,
  price: products.price,
  stock: products.stock,
  createdAt: products.createdAt,
} as const;

// GET /api/products?search=&category=&brand=&minPrice=&maxPrice=&sort=price&order=desc
productsRouter.get('/', (req, res) => {
  const { search, category, brand, minPrice, maxPrice, sort, order } = req.query;

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
  if (typeof category === 'string' && category !== '') {
    filters.push(eq(products.category, category));
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

  const sortColumn =
    SORTABLE_COLUMNS[sort as keyof typeof SORTABLE_COLUMNS] ?? products.name;
  const direction = order === 'desc' ? desc : asc;

  const rows = db
    .select()
    .from(products)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(direction(sortColumn))
    .all();

  res.json(rows);
});

// GET /api/products/categories — categorie distinte per i filtri del frontend
productsRouter.get('/categories', (_req, res) => {
  const rows = db
    .selectDistinct({ category: products.category })
    .from(products)
    .orderBy(asc(products.category))
    .all();
  res.json(rows.map((r) => r.category));
});

productsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id non valido' });
  }
  const product = db.select().from(products).where(eq(products.id, id)).get();
  if (!product) {
    return res.status(404).json({ error: 'Prodotto non trovato' });
  }
  res.json(product);
});

interface ProductBody {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  brand?: unknown;
  price?: unknown;
  stock?: unknown;
  imageUrl?: unknown;
}

function validateProduct(body: ProductBody) {
  const errors: string[] = [];
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push('Il nome è obbligatorio');
  }
  if (typeof body.category !== 'string' || body.category.trim() === '') {
    errors.push('La categoria è obbligatoria');
  }
  const price = Number(body.price);
  if (Number.isNaN(price) || price < 0) {
    errors.push('Il prezzo deve essere un numero maggiore o uguale a 0');
  }
  const stock = body.stock === undefined || body.stock === '' ? 0 : Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.push('La disponibilità deve essere un intero maggiore o uguale a 0');
  }
  if (errors.length > 0) {
    return { errors, data: null };
  }
  return {
    errors: null,
    data: {
      name: (body.name as string).trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      category: (body.category as string).trim(),
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
  const created = db.insert(products).values(data).returning().get();
  res.status(201).json(created);
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
  const updated = db.update(products).set(data).where(eq(products.id, id)).returning().get();
  if (!updated) {
    return res.status(404).json({ error: 'Prodotto non trovato' });
  }
  res.json(updated);
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
