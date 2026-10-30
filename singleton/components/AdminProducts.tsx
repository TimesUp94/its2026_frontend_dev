'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ProductFormDialog } from '@/components/ProductFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/format'
import { deleteProductAction } from '@/server/actions/products'
import type { CategoryRow, ProductRow } from '@/server/catalog'

export function AdminProducts({
  products,
  categories,
}: {
  products: ProductRow[]
  categories: CategoryRow[]
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [pending, startTransition] = useTransition()

  const handleDelete = (product: ProductRow) => {
    if (!window.confirm(`Eliminare "${product.name}" dal catalogo?`)) return
    startTransition(async () => {
      const result = await deleteProductAction(product.id)
      if (result.error) toast.error(result.error)
      else {
        toast.success(result.success ?? 'Articolo eliminato')
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestione catalogo</h1>
          <p className="text-muted-foreground">
            Aggiungi, modifica o elimina gli articoli del negozio.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="size-4" />
          Nuovo articolo
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Prezzo</TableHead>
              <TableHead className="text-right">Disponibilità</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{product.category}</Badge>
                </TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                <TableCell className="text-right">
                  {product.stock > 0 ? product.stock : <Badge variant="destructive">Esaurito</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Modifica"
                      onClick={() => {
                        setEditing(product)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Elimina"
                      disabled={pending}
                      onClick={() => handleDelete(product)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nessun articolo nel catalogo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Montato solo da aperto: ogni apertura riparte da uno stato pulito */}
      {dialogOpen && (
        <ProductFormDialog
          open
          onOpenChange={setDialogOpen}
          product={editing}
          categories={categories}
        />
      )}
    </>
  )
}
