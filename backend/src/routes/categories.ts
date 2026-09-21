import { asc, count, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.ts';
import { categories, products } from '../db/schema.ts';

export const categoriesRouter = Router();

/** Categorie con il numero di articoli collegati (relazione uno-a-molti). */
function selectCategoriesWithCount() {
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
    .groupBy(categories.id);
}

// GET /api/categories — pubblica, elenco completo delle categorie
categoriesRouter.get('/', (_req, res) => {
  const rows = selectCategoriesWithCount().orderBy(asc(categories.name)).all();
  res.json(rows);
});

// GET /api/categories/:id — pubblica, dettaglio di una categoria
categoriesRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id non valido' });
  }
  const category = selectCategoriesWithCount().where(eq(categories.id, id)).get();
  if (!category) {
    return res.status(404).json({ error: 'Categoria non trovata' });
  }
  res.json(category);
});

// GET /api/categories/:id/products — pubblica, articoli di una categoria
categoriesRouter.get('/:id/products', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id non valido' });
  }
  const category = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!category) {
    return res.status(404).json({ error: 'Categoria non trovata' });
  }
  const rows = db
    .select()
    .from(products)
    .where(eq(products.categoryId, id))
    .orderBy(asc(products.name))
    .all();
  res.json(rows.map((p) => ({ ...p, category: category.name })));
});
