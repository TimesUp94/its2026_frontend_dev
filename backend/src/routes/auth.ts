import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { JWT_SECRET, requireAuth, type AuthPayload } from '../middleware/auth.ts';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email e password sono obbligatorie' });
  }

  const user = db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const payload: AuthPayload = { userId: user.id, email: user.email, isAdmin: user.isAdmin };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
  });
});

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (typeof name !== 'string' || name.trim() === '' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Nome, email e password sono obbligatori' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La password deve contenere almeno 8 caratteri' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'Inserisci un indirizzo email valido' });
  }
  if (db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).get()) {
    return res.status(409).json({ error: 'Esiste già un account con questa email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = db
    .insert(users)
    .values({ name: name.trim(), email: normalizedEmail, passwordHash, isAdmin: false })
    .returning({ id: users.id })
    .get();
  const user = {
    id: inserted.id,
    name: name.trim(),
    email: normalizedEmail,
    isAdmin: false,
  };
  const token = jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.isAdmin } satisfies AuthPayload,
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  res.status(201).json({ token, user });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.auth });
});
