import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { usaPiattaforma } from '@/lib/piattaforma'

const COLONNE_CSV = ['id', 'nome', 'categoria', 'marca', 'prezzo', 'disponibilità'] as const

/** Excel in italiano si aspetta il punto e virgola; le virgolette si raddoppiano */
function campoCsv(valore: string): string {
  return /[";\r\n]/.test(valore) ? `"${valore.replaceAll('"', '""')}"` : valore
}

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

  if (!user || !user.isAdmin) {
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

  const handleExport = async () => {
    // Stessa UI nel browser e nel desktop: cambia solo chi salva il file
    const piattaforma = usaPiattaforma()
    const righe = [
      [...COLONNE_CSV],
      ...products.map((product) => [
        String(product.id),
        product.name,
        product.category,
        product.brand,
        product.price.toFixed(2),
        String(product.stock),
      ]),
    ]
    const csv = righe.map((riga) => riga.map(campoCsv).join(';')).join('\r\n')
    try {
      const salvato = await piattaforma.esportaCatalogo(csv, 'catalogo.csv')
      if (!salvato) return
      toast.success(`Catalogo esportato (${products.length} articoli)`)
      await piattaforma.notifica(
        'Catalogo esportato',
        `${products.length} articoli salvati in formato CSV`,
      )
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={products.length === 0}>
            <Download className="size-4" />
            Esporta catalogo
          </Button>
          <Button onClick={handleNew}>
            <Plus className="size-4" />
            Nuovo articolo
          </Button>
        </div>
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
