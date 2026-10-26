import { useEffect, useState } from 'react'

/**
 * L'ISOLA.
 *
 * Tutto il resto di questo sito e' HTML generato una volta e servito come file.
 * Questo componente no: e' React, viene idratato nel browser e al momento della
 * visita chiede all'API il prezzo di adesso.
 *
 * E' il pezzo che risolve il difetto strutturale di un sito statico: il prezzo
 * scritto in pagina e' quello del giorno della generazione. Invece di rendere
 * dinamico tutto il sito per un numero, rendiamo dinamico il numero.
 *
 * Nel componente .astro che lo usa c'e' scritto client:visible: il JavaScript
 * viene scaricato solo quando la scheda entra nello schermo. Se il lettore non
 * arriva fino la', non scarica niente.
 *
 * AbortController e' lo stesso schema dell'hook useProducts del modulo 1: se il
 * componente sparisce prima della risposta, la richiesta si annulla.
 */

const API_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '')

const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format

type Stato = 'attesa' | 'confermato' | 'cambiato' | 'errore'

const NOTA: Record<Stato, string> = {
  attesa: 'prezzo del giorno di pubblicazione',
  confermato: 'prezzo verificato adesso',
  cambiato: 'prezzo aggiornato adesso',
  errore: 'negozio non raggiungibile: prezzo di pubblicazione',
}

export default function PrezzoLive({
  productId,
  prezzoAlBuild,
}: {
  productId: number
  prezzoAlBuild: number
}) {
  const [prezzo, setPrezzo] = useState(prezzoAlBuild)
  const [stato, setStato] = useState<Stato>('attesa')

  useEffect(() => {
    const controllo = new AbortController()

    fetch(`${API_URL}/products/${productId}`, { signal: controllo.signal })
      .then((risposta) => {
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`)
        return risposta.json() as Promise<{ price: number }>
      })
      .then((prodotto) => {
        setPrezzo(prodotto.price)
        setStato(prodotto.price === prezzoAlBuild ? 'confermato' : 'cambiato')
      })
      .catch(() => {
        if (!controllo.signal.aborted) setStato('errore')
      })

    return () => controllo.abort()
  }, [productId, prezzoAlBuild])

  return (
    <p className="leading-tight">
      <span className="text-xl font-semibold">{euro(prezzo)}</span>
      {stato === 'cambiato' && (
        <span className="ml-2 text-sm text-muted-foreground line-through">
          {euro(prezzoAlBuild)}
        </span>
      )}
      <span className="block text-xs text-muted-foreground" aria-live="polite">
        {NOTA[stato]}
      </span>
    </p>
  )
}
