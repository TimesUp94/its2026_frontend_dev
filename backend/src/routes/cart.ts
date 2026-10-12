import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.ts';
import { cartItems, categories, products } from '../db/schema.ts';
import { requireCustomer } from '../middleware/auth.ts';

export const cartRouter = Router();
cartRouter.use(requireCustomer);

cartRouter.get('/', (req, res) => {
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
    .where(eq(cartItems.userId, req.auth!.userId))
    .all();

  const items = rows.map((row) => ({
    id: row.cartItemId,
    quantity: row.quantity,
    product: row.product,
    subtotal: row.product.price * row.quantity,
  }));
  res.json({ items, total: items.reduce((sum, item) => sum + item.subtotal, 0) });
});

cartRouter.post('/items', (req, res) => {
  const productId = Number(req.body?.productId);
  const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Articolo e quantità non validi' });
  }
  const product = db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return res.status(404).json({ error: 'Articolo non trovato' });
  }

  const userId = req.auth!.userId;
  const existing = db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .get();
  if (existing) {
    db.update(cartItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItems.id, existing.id))
      .run();
  } else {
    db.insert(cartItems).values({ userId, productId, quantity }).run();
  }
  res.status(201).json({ message: 'Articolo aggiunto al carrello' });
});

cartRouter.patch('/items/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body?.quantity);
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Articolo e quantità non validi' });
  }
  const updated = db
    .update(cartItems)
    .set({ quantity })
    .where(and(eq(cartItems.userId, req.auth!.userId), eq(cartItems.productId, productId)))
    .returning({ id: cartItems.id })
    .get();
  if (!updated) return res.status(404).json({ error: 'Articolo non trovato nel carrello' });
  res.json({ message: 'Quantità aggiornata' });
});

cartRouter.delete('/items/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: 'Id articolo non valido' });
  }
  const deleted = db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, req.auth!.userId), eq(cartItems.productId, productId)))
    .returning({ id: cartItems.id })
    .get();
  if (!deleted) return res.status(404).json({ error: 'Articolo non trovato nel carrello' });
  res.status(204).end();
});

cartRouter.delete('/', (req, res) => {
  db.delete(cartItems).where(eq(cartItems.userId, req.auth!.userId)).run();
  res.status(204).end();
});
