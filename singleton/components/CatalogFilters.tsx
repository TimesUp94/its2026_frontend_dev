'use client'

import { ArrowDownAZ, ArrowUpAZ, Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CategoryRow } from '@/server/catalog'

const ALL_CATEGORIES = 'all'

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'price', label: 'Prezzo' },
  { value: 'stock', label: 'Disponibilità' },
  { value: 'category', label: 'Categoria' },
  { value: 'createdAt', label: 'Più recenti' },
]

interface Values {
  search: string
  category: string
  minPrice: string
  maxPrice: string
  sort: string
  order: string
}

/**
 * I filtri scrivono nella query string; e' il server a rifare la query.
 * La ricerca testuale aspetta 300ms per non navigare a ogni tasto premuto.
 */
export function CatalogFilters({
  categories,
  values,
}: {
  categories: CategoryRow[]
  values: Values
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(values.search)

  const push = (changes: Partial<Values>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === ALL_CATEGORIES) next.delete(key)
      else next.set(key, value)
    }
    startTransition(() => router.push(next.size ? `/?${next}` : '/'))
  }

  useEffect(() => {
    if (search === values.search) return
    const timer = setTimeout(() => push({ search }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
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

      <Select
        value={values.category || ALL_CATEGORIES}
        onValueChange={(value) => push({ category: value })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>Tutte le categorie</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.name}>
              {c.name} ({c.productCount})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        min="0"
        placeholder="Prezzo min"
        className="w-28"
        defaultValue={values.minPrice}
        onBlur={(e) => push({ minPrice: e.target.value })}
      />
      <Input
        type="number"
        min="0"
        placeholder="Prezzo max"
        className="w-28"
        defaultValue={values.maxPrice}
        onBlur={(e) => push({ maxPrice: e.target.value })}
      />

      <Select value={values.sort} onValueChange={(value) => push({ sort: value })}>
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
        title={values.order === 'asc' ? 'Ordine crescente' : 'Ordine decrescente'}
        onClick={() => push({ order: values.order === 'asc' ? 'desc' : 'asc' })}
      >
        {values.order === 'asc' ? (
          <ArrowDownAZ className="size-4" />
        ) : (
          <ArrowUpAZ className="size-4" />
        )}
      </Button>
    </div>
  )
}
