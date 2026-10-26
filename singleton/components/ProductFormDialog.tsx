'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveProductAction, type ProductFormState } from '@/server/actions/products'
import type { CategoryRow, ProductRow } from '@/server/catalog'

const EMPTY: ProductFormState = {}

/**
 * Le categorie arrivano gia' pronte dal Server Component che rende la pagina:
 * non serve nessuna chiamata al momento dell'apertura, erano gia' nel primo
 * rendering. Il salvataggio passa per la Server Action, che rivalida il
 * catalogo appena la scrittura va a buon fine.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Articolo da modificare; null per crearne uno nuovo */
  product: ProductRow | null
  categories: CategoryRow[]
}) {
  const router = useRouter()
  const [state, submit, pending] = useActionState(saveProductAction, EMPTY)
  const [categoryId, setCategoryId] = useState(product ? String(product.categoryId) : '')

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      onOpenChange(false)
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Modifica articolo' : 'Nuovo articolo'}</DialogTitle>
          <DialogDescription>
            {product
              ? 'Aggiorna le informazioni dell’articolo e salva.'
              : 'Compila i campi per aggiungere un articolo al catalogo.'}
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          {product && <input type="hidden" name="id" value={product.id} />}
          {/* Il Select di Radix non e' un campo nativo: il valore viaggia qui */}
          <input type="hidden" name="categoryId" value={categoryId} />

          <div className="space-y-2">
            <Label htmlFor="p-name">Nome *</Label>
            <Input id="p-name" name="name" required defaultValue={product?.name ?? ''} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-category">Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="p-category" className="w-full">
                  <SelectValue placeholder="Scegli una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-brand">Marca</Label>
              <Input id="p-brand" name="brand" defaultValue={product?.brand ?? ''} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-description">Descrizione</Label>
            <Input
              id="p-description"
              name="description"
              defaultValue={product?.description ?? ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Prezzo (€) *</Label>
              <Input
                id="p-price"
                name="price"
                inputMode="decimal"
                required
                defaultValue={product ? String(product.price) : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Disponibilità</Label>
              <Input
                id="p-stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product ? String(product.stock) : ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-image">URL immagine</Label>
            <Input id="p-image" name="imageUrl" defaultValue={product?.imageUrl ?? ''} />
          </div>

          {state.error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
