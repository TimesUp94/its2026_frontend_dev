import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.ts';
import { cartItems, orderItems, orders, products } from '../db/schema.ts';
import { requireCustomer } from '../middleware/auth.ts';

export const ordersRouter = Router();
ordersRouter.use(requireCustomer);

ordersRouter.post('/', (req, res) => {
  const { paymentCardholder, paymentLastFour } = req.body ?? {};
  if (
    typeof paymentCardholder !== 'string' ||
    paymentCardholder.trim() === '' ||
    typeof paymentLastFour !== 'string' ||
    paymentLastFour.trim() === ''
  ) {
    return res.status(400).json({ error: 'Inserisci i dati richiesti per il pagamento dimostrativo' });
  }

  const userId = req.auth!.userId;
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
    .all();
  if (items.length === 0) {
    return res.status(400).json({ error: 'Il carrello è vuoto' });
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const order = db.transaction((tx) => {
    const inserted = tx
      .insert(orders)
      .values({
        userId,
        total,
        paymentMethod: 'mock-card',
        paymentCardholder: paymentCardholder.trim(),
        paymentLastFour: paymentLastFour.trim().slice(-4),
      })
      .returning({ id: orders.id, createdAt: orders.createdAt })
      .get();
    tx.insert(orderItems)
      .values(
        items.map((item) => ({
          orderId: inserted.id,
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      )
      .run();
    tx.delete(cartItems).where(eq(cartItems.userId, userId)).run();
    return inserted;
  });

  res.status(201).json({
    id: order.id,
    status: 'accepted',
    total,
    createdAt: order.createdAt,
    payment: {
      method: 'mock-card',
      cardholder: paymentCardholder.trim(),
      lastFour: paymentLastFour.trim().slice(-4),
    },
    items,
    message: 'Ordine accettato in modalità dimostrativa. Nessun pagamento è stato eseguito.',
  });
});
