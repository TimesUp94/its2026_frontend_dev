import type { Metadata } from 'next'
import Link from 'next/link'
import { APP_URL } from '@/lib/api'
import { Breadcrumbs } from '@/components/Breadcrumbs'

/**
 * Una pagina senza dati: nessuna chiamata all'API, nessun parametro. Next la
 * trasforma in un file HTML in fase di build e da quel momento costa quanto costa
 * servire un file. Nell'elenco di "next build" e' quella marcata con il pallino.
 */

export const metadata: Metadata = {
  title: 'Chi siamo',
  description:
    'minicommerce e\' il progetto del corso di Frontend Development dell\'ITS: ' +
    'un negozio di informatica con API, applicazione React, versione desktop e questa vetrina.',
  alternates: { canonical: '/chi-siamo' },
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: 'Chi siamo', percorso: '/chi-siamo' },
        ]}
      />

      <h1 className="text-3xl font-bold tracking-tight">Chi siamo</h1>

      <div className="space-y-4 leading-7 text-muted-foreground">
        <p>
          <strong className="text-foreground">minicommerce</strong> e&apos; il progetto che
          accompagna il corso di Frontend Development dell&apos;ITS. Un negozio di informatica
          piccolo ma completo: un&apos;API con autenticazione e carrello, un catalogo di articoli
          veri, un&apos;area di amministrazione.
        </p>
        <p>
          Lo stesso catalogo viene mostrato in quattro modi diversi, e ogni modo e&apos; una
          lezione: un&apos;applicazione a pagina singola in React, un&apos;applicazione desktop
          con Electron e con Tauri, un&apos;applicazione mobile, e questo sito.
        </p>
        <h2 className="pt-2 text-xl font-semibold text-foreground">
          Perche&apos; questo sito e l&apos;applicazione sono due cose distinte
        </h2>
        <p>
          L&apos;applicazione serve a <em>fare</em>: accedere, riempire il carrello, gestire gli
          articoli. Vive nel browser, si carica una volta e poi parla con l&apos;API. Chi la apre
          sa gia&apos; che esiste.
        </p>
        <p>
          Questo sito serve a <em>farsi trovare</em>. Ogni articolo ha il suo indirizzo, il suo
          titolo e il suo testo, scritti nell&apos;HTML prima che arrivi il visitatore: un motore
          di ricerca li legge senza eseguire una riga di JavaScript. Per questo le due cose sono
          costruite in modo diverso, pur mostrando gli stessi dati.
        </p>
        <p>
          Quando c&apos;e&apos; da comprare, la vetrina passa la mano:{' '}
          <a className="underline hover:text-foreground" href={APP_URL}>
            apri l&apos;applicazione
          </a>
          . Quando c&apos;e&apos; da guardare, resti qui:{' '}
          <Link className="underline hover:text-foreground" href="/categorie">
            sfoglia le categorie
          </Link>
          .
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Dove siamo</dt>
          <dd className="font-medium">Italia</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Valuta</dt>
          <dd className="font-medium">Euro</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Progetto</dt>
          <dd className="font-medium">ITS, anno formativo 2026/2027</dd>
        </div>
      </dl>
    </main>
  )
}
