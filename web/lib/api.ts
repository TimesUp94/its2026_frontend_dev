/**
 * Il client dell'API, versione server.
 *
 * Nel frontend React questo file usa axios, legge il token da localStorage e gira
 * nel browser. Qui gira in Node, dentro il server di Next: niente localStorage,
 * niente token, solo le rotte pubbliche del catalogo. E' la differenza che conta
 * fra l'applicazione (SPA) e la vetrina (questo progetto).
 *
 * Le funzioni marcate "use cache" sono quelle che alimentano le pagine statiche:
 * il loro risultato viene memorizzato, etichettato con cacheTag() e buttato via
 * solo quando scade (cacheLife) o quando qualcuno invalida l'etichetta
 * (revalidateTag, vedi app/api/revalidate/route.ts).
 */
import { cacheLife, cacheTag } from 'next/cache'

/** Senza barra finale: la aggiungiamo noi davanti a ogni percorso. */
export const API_URL = (process.env.API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '')

/** Dove vive la SPA: carrello, login e area admin restano la' (vedi docs/WEB-NEXTJS.md). */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173'
).replace(/\/+$/, '')

export interface Category {
  id: number
  name: string
  description: string
  productCount: number
  createdAt: string
}

export interface Product {
  id: number
  name: string
  description: string
  categoryId: number
  category: string
  brand: string
  price: number
  stock: number
  imageUrl: string | null
  createdAt: string
}

export interface ProductFilters {
  search?: string
  category?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  order?: string
}

/**
 * Una chiamata HTTP sola, con un messaggio d'errore che si capisce: durante
 * "next build" queste chiamate avvengono sul PC di chi compila, e se il backend
 * non e' avviato la build si ferma. E' la prima cosa che si impara sul rendering
 * lato server: i dati devono esserci nel momento in cui si genera l'HTML.
 */
async function chiamaApi<T>(percorso: string, accettaMancante = false): Promise<T | null> {
  const indirizzo = `${API_URL}${percorso}`
  let risposta: Response
  try {
    risposta = await fetch(indirizzo, {
      headers: { Accept: 'application/json' },
      // Nessuna cache a questo livello: la cache la decidono le funzioni "use cache"
      // qui sotto, cosi' c'e' un solo posto in cui guardare.
      cache: 'no-store',
    })
  } catch (errore) {
    throw new Error(
      `Non riesco a contattare l'API su ${indirizzo}. Il backend e' avviato? (cd backend && npm run dev)`,
      { cause: errore },
    )
  }
  if (risposta.status === 404 && accettaMancante) return null
  if (!risposta.ok) {
    throw new Error(`${indirizzo} ha risposto ${risposta.status} ${risposta.statusText}`)
  }
  return (await risposta.json()) as T
}

/** Catalogo completo: pagine statiche, sitemap e generateStaticParams partono da qui. */
export async function getCatalog(): Promise<Product[]> {
  'use cache'
  cacheTag('prodotti')
  cacheLife('hours')
  return (await chiamaApi<Product[]>('/products?sort=name&order=asc')) ?? []
}

/** Un singolo articolo. Restituisce null se non esiste: la pagina chiamera' notFound(). */
export async function getProduct(id: number): Promise<Product | null> {
  'use cache'
  cacheTag('prodotti', `prodotto-${id}`)
  cacheLife('hours')
  return chiamaApi<Product>(`/products/${id}`, true)
}

export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheTag('categorie')
  cacheLife('hours')
  return (await chiamaApi<Category[]>('/categories')) ?? []
}

export async function getProductsByCategory(nomeCategoria: string): Promise<Product[]> {
  'use cache'
  cacheTag('prodotti', `categoria-${nomeCategoria}`)
  cacheLife('hours')
  const query = new URLSearchParams({ category: nomeCategoria, sort: 'name', order: 'asc' })
  return (await chiamaApi<Product[]>(`/products?${query}`)) ?? []
}

/**
 * Quando e' stata generata la copia in cache che stiamo leggendo.
 * Ha la stessa etichetta 'prodotti' del catalogo, quindi si aggiorna insieme a lui:
 * e' il modo piu' semplice per vedere a lezione che una pagina "statica" non e'
 * congelata per sempre.
 */
export async function getCacheStamp(): Promise<string> {
  'use cache'
  cacheTag('prodotti')
  cacheLife('hours')
  return new Date().toISOString()
}

/**
 * La ricerca con i filtri della query string NON e' in cache: cambia a ogni visita,
 * quindi questa parte del sito e' renderizzata su richiesta (SSR) e non pregenerata.
 */
export async function searchProducts(filtri: ProductFilters): Promise<Product[]> {
  const query = new URLSearchParams()
  for (const [chiave, valore] of Object.entries(filtri)) {
    if (typeof valore === 'string' && valore.trim() !== '') query.set(chiave, valore.trim())
  }
  const coda = query.size > 0 ? `?${query}` : ''
  return (await chiamaApi<Product[]>(`/products${coda}`)) ?? []
}
