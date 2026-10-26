'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, registerAction, type AuthFormState } from '@/server/actions/auth'

const EMPTY: AuthFormState = {}

/**
 * useActionState collega il modulo alla Server Action: l'invio avviene con una
 * POST gestita da Next, e l'eventuale messaggio di errore torna nello stato.
 */
export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginState, submitLogin, loginPending] = useActionState(loginAction, EMPTY)
  const [registerState, submitRegister, registerPending] = useActionState(registerAction, EMPTY)

  const isRegister = mode === 'register'
  const state = isRegister ? registerState : loginState
  const pending = isRegister ? registerPending : loginPending

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isRegister ? 'Crea un account cliente' : 'Accedi'}</CardTitle>
        <CardDescription>
          {isRegister
            ? 'Crea il tuo account per salvare il carrello e inviare ordini dimostrativi.'
            : 'Accedi come cliente per acquistare oppure come amministratore per gestire il catalogo.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={isRegister ? 'outline' : 'default'}
            onClick={() => setMode('login')}
          >
            Accedi
          </Button>
          <Button
            type="button"
            variant={isRegister ? 'default' : 'outline'}
            onClick={() => setMode('register')}
          >
            Crea account
          </Button>
        </div>

        <form action={isRegister ? submitRegister : submitLogin} className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? isRegister
                ? 'Creazione account...'
                : 'Accesso in corso...'
              : isRegister
                ? 'Crea account cliente'
                : 'Accedi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
