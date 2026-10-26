import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'

/**
 * COME SI AGGIORNA UN SITO STATICO.
 *
 * La domanda arriva sempre, ed e' quella giusta: se le pagine sono generate in
 * anticipo, cosa succede quando l'amministratore cambia un prezzo?
 *
 * Risposta: si butta via la copia in cache. Ogni funzione di lib/api.ts etichetta
 * il proprio risultato con cacheTag('prodotti'); questa rotta chiama
 * revalidateTag('prodotti'), e la prima visita successiva rigenera l'HTML con i
 * dati nuovi. Nessuna build, nessun deploy, un paio di secondi.
 *
 * Chiunque potrebbe chiamarla, quindi serve un segreto condiviso, in una variabile
 * d'ambiente e mai nel repository:
 *
 *   curl -X POST "http://localhost:3000/api/revalidate" ^
 *        -H "x-revalidate-secret: il-vostro-segreto" ^
 *        -H "content-type: application/json" ^
 *        -d "{\"tag\":\"prodotti\"}"
 *
 * Esercizio naturale: farla chiamare dal backend dentro PUT /api/products/:id,
 * cosi' il sito si aggiorna da solo appena si salva un articolo.
 */

/** Solo etichette che usiamo davvero: non si invalida a comando quello che capita. */
const ETICHETTE_FISSE = new Set(['prodotti', 'categorie'])

function etichettaValida(tag: string): boolean {
  return ETICHETTE_FISSE.has(tag) || /^prodotto-\d+$/.test(tag) || /^categoria-.+$/.test(tag)
}

export async function POST(richiesta: NextRequest) {
  const segreto = process.env.REVALIDATE_SECRET

  if (!segreto) {
    return Response.json(
      { error: 'REVALIDATE_SECRET non configurato: vedi web/.env.example' },
      { status: 500 },
    )
  }

  const fornito =
    richiesta.headers.get('x-revalidate-secret') ??
    new URL(richiesta.url).searchParams.get('secret')

  if (fornito !== segreto) {
    return Response.json({ error: 'Segreto mancante o sbagliato' }, { status: 401 })
  }

  const corpo: unknown = await richiesta.json().catch(() => ({}))
  const tag =
    typeof corpo === 'object' && corpo !== null && 'tag' in corpo && typeof corpo.tag === 'string'
      ? corpo.tag
      : 'prodotti'

  if (!etichettaValida(tag)) {
    return Response.json({ error: `Etichetta non ammessa: ${tag}` }, { status: 400 })
  }

  /*
   * Il secondo argomento dice quanto si puo' ancora servire la copia vecchia mentre
   * quella nuova viene preparata: con 'max' il visitatore successivo vede ancora il
   * prezzo di prima e l'aggiornamento avviene di nascosto, con { expire: 0 } la copia
   * vecchia va subito in pattumiera e la prima visita paga la rigenerazione.
   * In produzione si preferisce 'max'; a lezione serve vedere il cambiamento subito.
   */
  revalidateTag(tag, { expire: 0 })

  return Response.json({ ok: true, tag, momento: new Date().toISOString() })
}

/** Un GET qui non ha senso: invalidare la cache e' un'azione, non una lettura. */
export function GET() {
  return Response.json(
    { error: 'Usare POST con l\'intestazione x-revalidate-secret' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
