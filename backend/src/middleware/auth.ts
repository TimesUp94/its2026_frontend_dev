import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export interface AuthPayload {
  userId: number;
  email: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.auth?.isAdmin) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }
    next();
  });
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.auth || req.auth.isAdmin) {
      return res.status(403).json({ error: 'Questa funzione è disponibile per gli account cliente' });
    }
    next();
  });
}
