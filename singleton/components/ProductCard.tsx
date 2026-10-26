import Link from 'next/link'
import { AddToCartButton } from '@/components/AddToCartButton'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatPrice } from '@/lib/format'
import type { ProductRow } from '@/server/catalog'

export function ProductCard({
  product,
  canBuy,
  isLoggedIn,
}: {
  product: ProductRow
  canBuy: boolean
  isLoggedIn: boolean
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            <Link href={`/prodotti/${product.id}`} className="hover:underline">
              {product.name}
            </Link>
          </CardTitle>
          <Badge variant="secondary">{product.category}</Badge>
        </div>
        {product.brand && (
          <CardDescription className="font-medium">{product.brand}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{formatPrice(product.price)}</span>
          {product.stock > 0 ? (
            <Badge variant="outline">Disponibili: {product.stock}</Badge>
          ) : (
            <Badge variant="destructive">Esaurito</Badge>
          )}
        </div>
        <AddToCartButton
          productId={product.id}
          disabled={product.stock === 0}
          canBuy={canBuy}
          isLoggedIn={isLoggedIn}
        />
      </CardFooter>
    </Card>
  )
}
