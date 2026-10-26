/**
 * Il ponte fra il blog e il negozio.
 *
 * Queste funzioni girano SOLO durante "astro build", sul computer di chi compila:
 * nel browser del visitatore non arriva una riga di questo file. E' il punto in cui
 * si capisce cosa vuol dire "generatore di siti statici": i dati vengono letti una
 * volta, al momento della generazione, e quello che resta e' HTML.
 *
 * Conseguenza da tenere a mente (e spiegata ai lettori nel post
 * "Perche' questo blog non e' fatto come il negozio"): il prezzo che finisce in
 * pagina e' il prezzo di quando il sito e' stato generato. Per quello che deve
 * essere sempre aggiornato c'e' l'isola PrezzoLive.tsx.
 */

export interface Product {
  id: number
  name: string
  description: string
  category: string
  brand: string
  price: number
  stock: number
  imageUrl: string | null
}

const API_URL = (import.meta.env.API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '')

/** Dove gira la SPA: i link "vai alla scheda" portano la'. */
export const APP_URL = (import.meta.env.PUBLIC_APP_URL ?? 'http://localhost:5173').replace(
  /\/+$/,
  '',
)

/**
 * Il catalogo si scarica una volta sola per tutta la build, non una volta per post:
 * sei post che citano due articoli ciascuno farebbero dodici chiamate identiche.
 * La promessa viene tenuta da parte e riusata (e' la cache piu' semplice che esista).
 */
let catalogo: Promise<Map<number, Product>> | null = null

async function caricaCatalogo(): Promise<Map<number, Product>> {
  const indirizzo = `${API_URL}/products`
  try {
    const risposta = await fetch(indirizzo)
    if (!risposta.ok) throw new Error(`${risposta.status} ${risposta.statusText}`)
    const prodotti = (await risposta.json()) as Product[]
    console.log(`[blog] catalogo letto da ${indirizzo}: ${prodotti.length} articoli`)
    return new Map(prodotti.map((prodotto) => [prodotto.id, prodotto]))
  } catch (errore) {
    /*
     * Qui NON fermiamo la build, e la scelta e' voluta: il contenuto di questo sito
     * sono gli articoli, i prezzi sono un extra. Un blog che non si pubblica perche'
     * il negozio e' spento sarebbe una fragilita' inventata.
     *
     * Nella vetrina Next (ramo web/nextjs) la scelta e' opposta, e per il motivo
     * opposto: la' il contenuto E' il prodotto, quindi senza dati la build deve
     * fallire invece di pubblicare pagine vuote.
     */
    console.warn(
      `[blog] non riesco a leggere ${indirizzo} (${(errore as Error).message}).\n` +
        '        Le schede prodotto nei post resteranno senza prezzo.\n' +
        '        Avviate il backend (cd backend && npm run dev) e rifate la build.',
    )
    return new Map()
  }
}

/** Gli articoli citati da un post, nell'ordine in cui sono scritti nel frontmatter. */
export async function getProducts(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  catalogo ??= caricaCatalogo()
  const perId = await catalogo
  return ids.map((id) => perId.get(id)).filter((prodotto): prodotto is Product => Boolean(prodotto))
}

export const formatPrice = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
}).format

export const formatDate = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format
