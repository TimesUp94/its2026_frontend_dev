import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
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
import {
  deleteProduct,
  fetchProducts,
  formatPrice,
  getErrorMessage,
  type Product,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function AdminPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    fetchProducts({ sort: 'createdAt', order: 'desc' })
      .then(setProducts)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user) reload()
  }, [user, reload])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditing(product)
    setDialogOpen(true)
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Eliminare "${product.name}" dal catalogo?`)) return
    try {
      await deleteProduct(product.id)
      toast.success('Articolo eliminato')
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestione catalogo</h1>
          <p className="text-muted-foreground">
            Aggiungi, modifica o elimina gli articoli del negozio.
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="size-4" />
          Nuovo articolo
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Caricamento...</p>
      ) : (
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
                    {product.stock > 0 ? (
                      product.stock
                    ) : (
                      <Badge variant="destructive">Esaurito</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Modifica"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Elimina"
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
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={reload}
      />
    </div>
  )
}
