import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { getSession } from '@/lib/session'

export const metadata = { title: 'Accedi · minicommerce' }

export default async function LoginPage() {
  // Chi ha gia' una sessione valida non ha motivo di rivedere il modulo
  if (await getSession()) redirect('/')
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-16">
      <AuthForm />
    </div>
  )
}
