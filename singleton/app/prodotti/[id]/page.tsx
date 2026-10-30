import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddToCartButton } from '@/components/AddToCartButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/format'
import { getSession } from '@/lib/session'
import { getProduct } from '@/server/catalog'

export async function generateMetadata({
  params,
}: PageProps<'/prodotti/[id]'>): Promise<Metadata> {
  const product = getProduct(Number((await params).id))
  if (!product) return { title: 'Articolo non trovato' }
  return {
    title: `${product.name} · minicommerce`,
    description: product.description,
  }
}

export default async function ProductPage({ params }: PageProps<'/prodotti/[id]'>) {
  const product = getProduct(Number((await params).id))
  if (!product) notFound()

  const session = await getSession()

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Torna al catalogo
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              {product.brand && <p className="text-muted-foreground">{product.brand}</p>}
            </div>
            <Badge variant="secondary">{product.category}</Badge>
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
            {product.stock > 0 ? (
              <Badge variant="outline">Disponibili: {product.stock}</Badge>
            ) : (
              <Badge variant="destructive">Esaurito</Badge>
            )}
          </div>

          <AddToCartButton
            productId={product.id}
            disabled={product.stock === 0}
            canBuy={Boolean(session && !session.isAdmin)}
            isLoggedIn={Boolean(session)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
