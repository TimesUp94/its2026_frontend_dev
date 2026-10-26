'use server'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { createSession, destroySession } from '@/lib/session'

export interface AuthFormState {
  error?: string
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) {
    return { error: 'Email e password sono obbligatorie' }
  }

  const user = db.select().from(users).where(eq(users.email, email)).get()
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'Credenziali non valide' }
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  })
  revalidatePath('/', 'layout')
  // redirect() interrompe l'esecuzione lanciando: va tenuto fuori da try/catch
  redirect(user.isAdmin ? '/admin' : '/')
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!name || !email || !password) {
    return { error: 'Nome, email e password sono obbligatori' }
  }
  if (!email.includes('@')) {
    return { error: 'Inserisci un indirizzo email valido' }
  }
  if (password.length < 8) {
    return { error: 'La password deve contenere almeno 8 caratteri' }
  }
  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    return { error: 'Esiste già un account con questa email' }
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const inserted = db
    .insert(users)
    .values({ name, email, passwordHash, isAdmin: false })
    .returning({ id: users.id })
    .get()

  await createSession({ userId: inserted.id, email, name, isAdmin: false })
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  revalidatePath('/', 'layout')
  redirect('/')
}
