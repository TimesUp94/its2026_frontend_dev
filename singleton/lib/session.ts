import 'server-only'

import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

/**
 * Sessione utente.
 *
 * Nella SPA il token JWT vive in localStorage e viaggia nell'header
 * Authorization. Qui il server c'e' gia', quindi il token sta in un cookie
 * httpOnly: il JavaScript della pagina non puo' leggerlo, e ogni Server
 * Component o Server Action lo ritrova da solo senza passarselo.
 */
export const SESSION_COOKIE = 'minicommerce_session'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 ore, come il backend Express

export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

export interface SessionUser {
  userId: number
  email: string
  name: string
  isAdmin: boolean
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: SESSION_MAX_AGE })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** L'utente collegato, oppure null se il cookie manca, e' scaduto o non e' valido. */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & SessionUser
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      isAdmin: payload.isAdmin,
    }
  } catch {
    return null
  }
}

/** Errore applicativo: le Server Action lo trasformano in un messaggio per l'utente. */
export class AuthError extends Error {}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new AuthError('Devi accedere per continuare')
  if (!session.isAdmin) throw new AuthError('Permessi insufficienti')
  return session
}

export async function requireCustomer(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new AuthError('Devi accedere per continuare')
  if (session.isAdmin) {
    throw new AuthError('Questa funzione è disponibile per gli account cliente')
  }
  return session
}
