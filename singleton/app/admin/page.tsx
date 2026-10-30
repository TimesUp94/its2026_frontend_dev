import { redirect } from 'next/navigation'
import { AdminProducts } from '@/components/AdminProducts'
import { getSession } from '@/lib/session'
import { listCategories, listProducts } from '@/server/catalog'

export const metadata = { title: 'Gestione catalogo · minicommerce' }

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Quest&apos;area è riservata agli amministratori.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <AdminProducts
        products={listProducts({ sort: 'createdAt', order: 'desc' })}
        categories={listCategories()}
      />
    </div>
  )
}
