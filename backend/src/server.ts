import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.ts';
import { categoriesRouter } from './routes/categories.ts';
import { productsRouter } from './routes/products.ts';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);

// Gestore errori centralizzato (Express 5 inoltra qui anche gli errori async)
app.use(
  (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[${req.method} ${req.originalUrl}]`, err?.stack ?? err);
    res.status(500).json({
      error: 'Errore interno del server',
      // In sviluppo il dettaglio aiuta a capire cosa è andato storto
      ...(process.env.NODE_ENV === 'production' ? {} : { detail: err?.message }),
    });
  },
);

app.listen(PORT, () => {
  console.log(`minicommerce backend in ascolto su http://localhost:${PORT}`);
});
