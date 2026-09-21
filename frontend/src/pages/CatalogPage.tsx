import { ArrowDownAZ, ArrowUpAZ, PackageX, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fetchCategories,
  fetchProducts,
  formatPrice,
  getErrorMessage,
  type Product,
  type ProductFilters,
} from '@/lib/api'

const ALL_CATEGORIES = 'all'

const SORT_OPTIONS: { value: NonNullable<ProductFilters['sort']>; label: string }[] = [
  { value: 'name', label: 'Nome' },
  { value: 'price', label: 'Prezzo' },
  { value: 'stock', label: 'Disponibilità' },
  { value: 'createdAt', label: 'Più recenti' },
]

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<NonNullable<ProductFilters['sort']>>('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => toast.error(getErrorMessage(err)))
  }, [])

  useEffect(() => {
    // piccolo debounce per non chiamare l'API a ogni tasto premuto
    const timer = setTimeout(() => {
      setLoading(true)
      fetchProducts({
        search: search || undefined,
        category: category === ALL_CATEGORIES ? undefined : category,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        sort,
        order,
      })
        .then(setProducts)
        .catch((err) => toast.error(getErrorMessage(err)))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [search, category, minPrice, maxPrice, sort, order])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Catalogo articoli</h1>
        <p className="text-muted-foreground">
          PC, periferiche, smartphone e accessori informatici.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, marca o descrizione..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Tutte le categorie</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min="0"
          placeholder="Prezzo min"
          className="w-28"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <Input
          type="number"
          min="0"
          placeholder="Prezzo max"
          className="w-28"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />

        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ordina per" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          title={order === 'asc' ? 'Ordine crescente' : 'Ordine decrescente'}
          onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        >
          {order === 'asc' ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />}
        </Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Caricamento...</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <PackageX className="size-8" />
          <p>Nessun articolo trovato con i filtri selezionati.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
                {product.brand && (
                  <CardDescription className="font-medium">{product.brand}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <p className="line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                {product.stock > 0 ? (
                  <Badge variant="outline">Disponibili: {product.stock}</Badge>
                ) : (
                  <Badge variant="destructive">Esaurito</Badge>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
