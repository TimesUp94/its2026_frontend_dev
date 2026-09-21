import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { JWT_SECRET, requireAdmin, type AuthPayload } from '../middleware/auth.ts';

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

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ user: req.auth });
});
