#!/usr/bin/env node
// -----------------------------------------------------------------------------
// setup-nextjs.mjs
//
// Trasforma minicommerce in un sito vetrina: aggiunge accanto alla SPA una
// seconda interfaccia, generata sul server, che un motore di ricerca puo' leggere.
//
// Esegue da solo tutti i comandi spiegati a lezione:
//   1. controlli preliminari
//   2. npx create-next-app@latest web ...      (il guscio, dalla CLI ufficiale)
//   3. via i file di esempio del generatore
//   4. i file della vetrina (pagine, componenti, metadati, sitemap, robots)
//   5. le variabili d'ambiente
//   6. npm install
//   7. npm run build                           (solo se l'API risponde)
//
// Uso:  node scripts/setup-nextjs.mjs [--forza] [--salta-install] [--salta-build]
//
// Solo moduli "node:", nessuna dipendenza esterna. Idempotente: se un file c'e'
// gia' non viene sovrascritto (--forza per riscriverlo).
//
// NOTA: il passo 7 ha bisogno del backend avviato (cd backend && npm run dev),
// perche' le pagine statiche nascono dai dati dell'API in fase di compilazione.
// Senza backend lo script arriva fino al passo 6 e lo dice.
// -----------------------------------------------------------------------------

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARGOMENTI = new Set(process.argv.slice(2))
const FORZA = ARGOMENTI.has('--forza')
const SALTA_INSTALL = ARGOMENTI.has('--salta-install')
const SALTA_BUILD = ARGOMENTI.has('--salta-build')
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const API_URL = process.env.API_URL ?? 'http://localhost:3001/api'

let passo = 0
const creati = []
const modificati = []

// --------------------------------------------------------------------------- //
// Utilita' di stampa ed esecuzione                                            //
// --------------------------------------------------------------------------- //

function titolo(testo) {
  passo += 1
  console.log(`\n[${passo}/7] ${testo}`)
}

function info(testo) {
  console.log(`      ${testo}`)
}

function avviso(testo) {
  console.log(`\n      ATTENZIONE: ${testo}`)
}

function errore(testo) {
  console.error(`\nERRORE: ${testo}\n`)
  process.exit(1)
}

/** Ogni comando esterno viene stampato prima di partire: sono quelli delle slide. */
function esegui(comando, argomenti, cwd) {
  const riga = `${comando} ${argomenti.join(' ')}`
  console.log(`\n> ${riga}`)
  // shell: true perche' su Windows npm e npx sono script .cmd
  const esito = spawnSync(riga, { cwd, stdio: 'inherit', shell: true })
  if (esito.error) errore(`impossibile eseguire "${riga}": ${esito.error.message}`)
  if (esito.status !== 0) errore(`"${riga}" uscito con codice ${esito.status}`)
}

// --------------------------------------------------------------------------- //
// Utilita' sui file                                                           //
// --------------------------------------------------------------------------- //

function assoluto(relativo) {
  return path.join(RADICE, ...relativo.split('/'))
}

/** Crea un file nostro. Se esiste lo lascia stare, salvo --forza. */
function crea(relativo, contenuto) {
  const percorso = assoluto(relativo)
  const testo = contenuto.endsWith('\n') ? contenuto : `${contenuto}\n`
  if (fs.existsSync(percorso)) {
    if (fs.readFileSync(percorso, 'utf8') === testo) {
      info(`= ${relativo} (identico)`)
      return false
    }
    if (!FORZA) {
      info(`= ${relativo} esiste gia': lasciato invariato (usa --forza per riscriverlo)`)
      return false
    }
  }
  fs.mkdirSync(path.dirname(percorso), { recursive: true })
  fs.writeFileSync(percorso, testo)
  info(`+ ${relativo}`)
  if (!creati.includes(relativo)) creati.push(relativo)
  return true
}

function copia(origine, destinazione) {
  const da = assoluto(origine)
  const a = assoluto(destinazione)
  if (!fs.existsSync(da)) errore(`file mancante: ${origine}`)
  if (fs.existsSync(a) && !FORZA) {
    info(`= ${destinazione} esiste gia'`)
    return false
  }
  fs.mkdirSync(path.dirname(a), { recursive: true })
  fs.copyFileSync(da, a)
  info(`+ ${destinazione}`)
  if (!creati.includes(destinazione)) creati.push(destinazione)
  return true
}

function elimina(relativo) {
  const percorso = assoluto(relativo)
  if (!fs.existsSync(percorso)) return false
  fs.rmSync(percorso, { force: true })
  info(`- ${relativo}`)
  return true
}

/** Aggiunge una riga a un file di testo, se non c'e' gia'. */
function aggiungiRiga(relativo, righe) {
  const percorso = assoluto(relativo)
  if (!fs.existsSync(percorso)) errore(`file mancante: ${relativo}`)
  const originale = fs.readFileSync(percorso, 'utf8')
  const daAggiungere = righe.filter((riga) => !originale.includes(riga))
  if (daAggiungere.length === 0) {
    info(`= ${relativo} (gia' a posto)`)
    return false
  }
  const fineRiga = originale.includes('\r\n') ? '\r\n' : '\n'
  const coda = originale.endsWith('\n') ? '' : fineRiga
  fs.writeFileSync(percorso, originale + coda + daAggiungere.join(fineRiga) + fineRiga)
  info(`~ ${relativo}`)
  if (!modificati.includes(relativo)) modificati.push(relativo)
  return true
}

/** Aggiunge dipendenze a un package.json senza toccare il resto. */
function aggiungiDipendenze(relativo, nuove) {
  const percorso = assoluto(relativo)
  const pacchetto = JSON.parse(fs.readFileSync(percorso, 'utf8'))
  pacchetto.dependencies ??= {}
  let cambiato = false
  for (const [nome, versione] of Object.entries(nuove)) {
    if (pacchetto.dependencies[nome]) {
      info(`= ${relativo}: ${nome} gia' presente (${pacchetto.dependencies[nome]})`)
      continue
    }
    pacchetto.dependencies[nome] = versione
    info(`~ ${relativo}: + ${nome}@${versione}`)
    cambiato = true
  }
  if (cambiato) {
    // Le dipendenze in ordine alfabetico: cosi' i diff restano leggibili.
    pacchetto.dependencies = Object.fromEntries(
      Object.entries(pacchetto.dependencies).sort(([a], [b]) => a.localeCompare(b)),
    )
    fs.writeFileSync(percorso, `${JSON.stringify(pacchetto, null, 2)}\n`)
    if (!modificati.includes(relativo)) modificati.push(relativo)
  }
  return cambiato
}

/** L'API risponde? Serve al passo 7: senza dati non si pregenerano le pagine. */
async function apiViva() {
  try {
    const risposta = await fetch(`${API_URL.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(2500),
    })
    return risposta.ok
  } catch {
    return false
  }
}

// --------------------------------------------------------------------------- //
// I file della vetrina                                                        //
// --------------------------------------------------------------------------- //

/**
 * Tutti i file della vetrina, uno dietro l'altro.
 *
 * Sono gli stessi che trovate in web/ sul ramo web/nextjs: qui stanno dentro lo
 * script perche' deve bastare questo file per passare dalla versione SPA alla
 * versione con la vetrina, senza scaricare nient'altro.
 */
const SORGENTI = {
  'web/next.config.ts': `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /*
   * cacheComponents e' il modello di cache di Next 16, e lo lasciamo acceso perche'
   * e' quello che si ottiene oggi con "npx create-next-app@latest".
   *
   * La regola, in una riga: nulla e' in cache se non lo chiedete voi. Una funzione
   * che legge dati e vuole finire in una pagina statica comincia con la direttiva
   * "use cache" (vedi lib/api.ts); tutto il resto e' dinamico e, se la pagina e'
   * pregenerata, va messo dietro un <Suspense>.
   *
   * Il vantaggio e' che "statico" e "dinamico" diventano una scelta scritta nel
   * codice, invece di un effetto collaterale di quale funzione si e' chiamata.
   */
  cacheComponents: true,

  /*
   * Precarica solo la parte statica dei link visibili: la navigazione sembra
   * istantanea senza scaricare in anticipo tutti i dati di tutte le pagine.
   */
  partialPrefetching: true,

  /*
   * Da dove next/image puo' scaricare le immagini da ottimizzare.
   *
   * Nel nostro seed imageUrl e' null, ma dall'area di amministrazione si puo'
   * incollare qualunque indirizzo, quindi qui accettiamo qualsiasi host https.
   * In produzione si fa l'opposto: si elencano gli host di cui ci si fida, perche'
   * ogni host in elenco puo' far lavorare (e pagare) il vostro ottimizzatore.
   */
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
`,
  'web/README.md': `# web/ - la vetrina di minicommerce (Next.js)

Questa cartella contiene il **sito pubblico** di minicommerce: le stesse informazioni
del catalogo, ma generate sul server e scritte nell'HTML prima che arrivi il
visitatore, in modo che un motore di ricerca le possa leggere.

Non e' una seconda versione dell'applicazione: login, carrello e area di
amministrazione restano nella SPA React dentro \`frontend/\`. Qui si guarda, la' si fa.

| | \`frontend/\` (SPA) | \`web/\` (vetrina) |
|---|---|---|
| Chi la usa | chi ha gia' deciso di comprare | chi deve ancora trovarvi |
| Dove gira | tutto nel browser | per la maggior parte sul server |
| HTML iniziale | un \`<div id="root">\` vuoto | la pagina completa |
| Dati | \`axios\` + token in \`localStorage\` | \`fetch\` sul server, senza token |
| Rotte | \`react-router-dom\` | cartelle dentro \`app/\` |

## Avvio rapido

\`\`\`bash
cd backend && npm run dev      # l'API su :3001, serve anche a questo sito
cd web     && npm run dev      # il sito su :3000
\`\`\`

Tutto il resto - prerequisiti, esperimenti da fare a lezione, come si aggiorna una
pagina statica quando cambia un prezzo, problemi noti - sta in
[\`docs/WEB-NEXTJS.md\`](../docs/WEB-NEXTJS.md).
`,
  'web/.env.example': `# Indirizzo pubblico del sito. Serve a title/canonical/Open Graph e alla sitemap:
# in produzione va cambiato, altrimenti dichiarate a Google che vivete su localhost.
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# L API di minicommerce, vista dal server di Next (non dal browser).
API_URL=http://localhost:3001/api

# Dove gira la SPA React: carrello, login e area admin restano la.
NEXT_PUBLIC_APP_URL=http://localhost:5173

# Segreto per POST /api/revalidate. Inventatene uno lungo e non committatelo mai.
REVALIDATE_SECRET=cambiami
`,
  'web/app/globals.css': `/*
 * Gli stessi nomi di colore del frontend React (bg-card, text-muted-foreground,
 * border...), cosi' la vetrina assomiglia all'applicazione senza portarsi dietro
 * shadcn/ui: qui non ci sono dialoghi ne' menu, solo testo e link.
 *
 * Differenza importante: il tema scuro non usa next-themes e una classe sul <html>,
 * ma solo prefers-color-scheme. Nessun JavaScript, nessuna idratazione, nessun
 * lampeggio: in un sito vetrina il tema e' un dettaglio del CSS.
 */
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.371 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 12%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
  }
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
  }
  /* Il focus deve restare visibile: la vetrina si naviga anche solo da tastiera. */
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}
`,
  'web/app/layout.tsx': `import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { StructuredData } from '@/components/StructuredData'
import { organizationJsonLd, webSiteJsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo'

/**
 * next/font scarica il font una volta sola, in fase di build, e lo serve dal nostro
 * dominio: nessuna chiamata a Google quando l'utente apre la pagina (meglio per la
 * privacy e per il GDPR) e nessun salto di layout, perche' Next calcola le metriche
 * del font e le mette nel CSS.
 */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * I metadati comuni a tutto il sito.
 *
 * metadataBase e' obbligatorio perche' Next possa trasformare '/prodotti/3-...' in
 * un indirizzo assoluto: i tag canonical e Open Graph relativi non servono a niente.
 *
 * title.template fa il resto: ogni pagina dichiara solo il proprio titolo e diventa
 * "ThinkPad X1 Carbon Gen 12 | minicommerce".
 *
 * Qui NON mettiamo alternates.canonical: si eredita, e un canonical sbagliato e'
 * peggio di nessun canonical. Ogni pagina dichiara il suo.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'minicommerce - informatica e accessori per studio e lavoro',
    template: \`%s | \${SITE_NAME}\`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'ITS - corso di Frontend Development' }],
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: SITE_NAME,
    url: '/',
    title: 'minicommerce - informatica e accessori per studio e lavoro',
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it" className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}>
      <body className="flex min-h-dvh flex-col font-sans">
        {/* Le due schede "chi siamo" per le macchine: una per l'organizzazione, una
            per il sito. Stanno nel layout perche' valgono per ogni pagina. */}
        <StructuredData data={organizationJsonLd()} />
        <StructuredData data={webSiteJsonLd()} />
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Salta al contenuto
        </a>
        <Header />
        <div id="contenuto" className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  )
}
`,
  'web/app/page.tsx': `import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories, searchProducts, type ProductFilters } from '@/lib/api'
import { FilterForm } from '@/components/FilterForm'
import { ProductGrid, ProductGridSkeleton } from '@/components/ProductGrid'
import { categoryPath, SITE_DESCRIPTION } from '@/lib/seo'

/**
 * IL CATALOGO: la pagina dinamica del sito.
 *
 * Dipende dalla query string (?search=&category=...), quindi non si puo' pregenerare:
 * esiste una pagina diversa per ogni combinazione di filtri. Next la rende a ogni
 * richiesta (SSR) e nell'elenco di "next build" la trovate marcata con la f corsiva.
 * Le schede prodotto, invece, sono pregenerate: quelle sono il contenuto che deve
 * finire su Google.
 *
 * Il guscio della pagina (titolo e testo) non aspetta l'API: dentro <Suspense> va
 * solo la parte che dipende dai filtri, e il browser riceve subito il resto.
 */

/** I parametri arrivano sempre come stringhe (o array, se ripetuti). Normalizziamoli. */
function leggiFiltri(parametri: Record<string, string | string[] | undefined>): ProductFilters {
  const uno = (chiave: string): string | undefined => {
    const valore = parametri[chiave]
    const testo = Array.isArray(valore) ? valore[0] : valore
    return typeof testo === 'string' && testo.trim() !== '' ? testo.trim() : undefined
  }
  return {
    search: uno('search'),
    category: uno('category'),
    minPrice: uno('minPrice'),
    maxPrice: uno('maxPrice'),
    sort: uno('sort'),
    order: uno('order'),
  }
}

function contaFiltri(filtri: ProductFilters): number {
  return Object.values(filtri).filter((valore) => valore !== undefined).length
}

/**
 * Il catalogo filtrato dichiara noindex.
 *
 * Non e' pigrizia: ?search=mouse&minPrice=10&order=desc e le sue infinite varianti
 * mostrano pezzi della stessa lista. Lasciarle indicizzare significa far spendere al
 * crawler il suo tempo su migliaia di doppioni invece che sulle schede prodotto.
 * "follow" resta attivo: i link dentro la pagina vanno seguiti, le pagine no.
 */
export async function generateMetadata({ searchParams }: PageProps<'/'>): Promise<Metadata> {
  const filtri = leggiFiltri(await searchParams)

  if (contaFiltri(filtri) === 0) {
    return {
      title: { absolute: 'minicommerce - informatica e accessori per studio e lavoro' },
      description: SITE_DESCRIPTION,
      alternates: { canonical: '/' },
    }
  }

  const pezzi = [
    filtri.search ? \`"\${filtri.search}"\` : null,
    filtri.category,
    filtri.minPrice ? \`da \${filtri.minPrice} euro\` : null,
    filtri.maxPrice ? \`fino a \${filtri.maxPrice} euro\` : null,
  ].filter(Boolean)

  return {
    title: \`Ricerca: \${pezzi.join(', ')}\`,
    description: SITE_DESCRIPTION,
    alternates: { canonical: '/' },
    robots: { index: false, follow: true },
  }
}

export default async function CatalogPage({ searchParams }: PageProps<'/'>) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Informatica e accessori, con le schede scritte bene
        </h1>
        <p className="max-w-2xl text-muted-foreground">{SITE_DESCRIPTION}</p>
      </section>

      <Suspense fallback={<SchermataInCaricamento />}>
        <CatalogResults searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

/** Tutto cio' che dipende dalla query string sta qui dentro, dietro il <Suspense>. */
async function CatalogResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filtri = leggiFiltri(await searchParams)
  const [categorie, prodotti] = await Promise.all([getCategories(), searchProducts(filtri)])

  return (
    <section className="space-y-6" aria-label="Catalogo">
      <FilterForm categorie={categorie} valori={filtri} />

      <p className="text-sm text-muted-foreground" role="status">
        {prodotti.length === 0
          ? 'Nessun articolo trovato'
          : \`\${prodotti.length} \${prodotti.length === 1 ? 'articolo' : 'articoli'}\`}
        {contaFiltri(filtri) > 0 ? ' con i filtri scelti' : ' in catalogo'}
      </p>

      {prodotti.length > 0 ? (
        <ProductGrid prodotti={prodotti} />
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Non abbiamo trovato niente con questi filtri.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Provate con meno vincoli, oppure ripartite dal{' '}
            <Link href="/" className="underline">
              catalogo completo
            </Link>
            .
          </p>
        </div>
      )}

      <nav aria-label="Vai a una categoria" className="flex flex-wrap gap-2 border-t pt-6">
        {categorie.map((categoria) => (
          <Link
            key={categoria.id}
            href={categoryPath(categoria.name)}
            className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
          >
            {categoria.name}
          </Link>
        ))}
      </nav>
    </section>
  )
}

function SchermataInCaricamento() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-xl border bg-card" />
      <ProductGridSkeleton />
    </div>
  )
}
`,
  'web/app/not-found.tsx': `import Link from 'next/link'

/**
 * La pagina 404.
 *
 * Non e' un dettaglio estetico: questa risposta porta davvero lo stato HTTP 404, e
 * un motore di ricerca che lo riceve toglie l'indirizzo dall'indice invece di tenere
 * in giro un link morto. Nella SPA, invece, qualunque indirizzo sbagliato risponde
 * 200 con la pagina vuota: per un crawler sono tutte pagine valide e identiche.
 *
 * Una finezza da sapere, e da provare con curl -I (vedi docs/WEB-NEXTJS.md): per un
 * indirizzo mai visto prima Next spedisce subito il guscio statico - e il guscio
 * parte con 200 - poi completa la pagina in streaming. Il 404 vero arriva dalla
 * seconda richiesta in poi, quando l'esito e' in cache. Nel frattempo la pagina
 * dichiara comunque noindex, quindi nell'indice non ci finisce.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">Errore 404</p>
      <h1 className="text-3xl font-bold tracking-tight">Questa pagina non esiste</h1>
      <p className="text-muted-foreground">
        L&apos;articolo potrebbe essere stato rimosso dal catalogo, oppure l&apos;indirizzo
        contiene un errore di battitura.
      </p>
      <div className="flex gap-2 pt-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Torna al catalogo
        </Link>
        <Link
          href="/categorie"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent"
        >
          Sfoglia le categorie
        </Link>
      </div>
    </main>
  )
}
`,
  'web/app/robots.ts': `import type { MetadataRoute } from 'next'
import { absoluteUrl, SITE_URL } from '@/lib/seo'

/**
 * robots.txt, generato da codice.
 *
 * Due cose sole, ma importanti:
 *  - dove sta la sitemap, cosi' il crawler non deve indovinare;
 *  - cosa NON vale la pena leggere: /api/ sono le nostre rotte di servizio.
 *
 * Attenzione a un equivoco frequente: "disallow" non nasconde niente e non protegge
 * niente. Dice solo "non perdere tempo qui". Se una pagina deve restare fuori
 * dall'indice si usa noindex nei metadati (vedi app/page.tsx), e se deve restare
 * privata ci vuole un controllo di autenticazione sul server.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
`,
  'web/app/sitemap.ts': `import type { MetadataRoute } from 'next'
import { getCatalog, getCategories } from '@/lib/api'
import { categorySlug, productSlug } from '@/lib/slug'
import { absoluteUrl } from '@/lib/seo'

/**
 * LA SITEMAP: l'elenco di tutti gli indirizzi del sito, in un formato che i motori
 * di ricerca leggono senza doverli scoprire a forza di link.
 *
 * Questo file si chiama sitemap.ts e Next lo serve su /sitemap.xml, generando l'XML
 * da solo. Non va scritto a mano e non va aggiornato a mano: nasce dai dati, quindi
 * ogni articolo nuovo ci finisce dentro alla prima rigenerazione.
 *
 * lastModified non e' decorativo: dice al crawler cosa ha senso riscaricare.
 * Attenzione a non metterci "adesso": se tutte le pagine risultano modificate a
 * ogni passaggio, l'informazione non vale piu' niente.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [prodotti, categorie] = await Promise.all([getCatalog(), getCategories()])

  const ultimoArticolo = prodotti
    .map((prodotto) => prodotto.createdAt)
    .sort()
    .at(-1)

  const pagineFisse: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: ultimoArticolo ? new Date(ultimoArticolo) : undefined,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/categorie'),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/chi-siamo'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const paginaCategorie: MetadataRoute.Sitemap = categorie.map((categoria) => ({
    url: absoluteUrl(\`/categorie/\${categorySlug(categoria)}\`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const pagineProdotti: MetadataRoute.Sitemap = prodotti.map((prodotto) => ({
    url: absoluteUrl(\`/prodotti/\${productSlug(prodotto)}\`),
    lastModified: new Date(prodotto.createdAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...pagineFisse, ...paginaCategorie, ...pagineProdotti]
}
`,
  'web/app/chi-siamo/page.tsx': `import type { Metadata } from 'next'
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
    'minicommerce e\\' il progetto del corso di Frontend Development dell\\'ITS: ' +
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
`,
  'web/app/categorie/page.tsx': `import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getCategories } from '@/lib/api'
import { categoryPath } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'

/**
 * L'indice delle categorie: pagina completamente statica, nessun parametro.
 * Serve agli utenti, ma soprattutto e' lo snodo che porta il crawler dalle pagine
 * generiche a quelle specifiche in due soli clic.
 */

export const metadata: Metadata = {
  title: 'Categorie',
  description:
    'Tutte le categorie del catalogo minicommerce: portatili, desktop, monitor, ' +
    'tastiere, mouse, smartphone e accessori.',
  alternates: { canonical: '/categorie' },
}

export default async function CategoriesPage() {
  const categorie = await getCategories()

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: 'Categorie', percorso: '/categorie' },
        ]}
      />

      <h1 className="text-3xl font-bold tracking-tight">Categorie</h1>
      <p className="max-w-2xl text-muted-foreground">
        Ogni categoria ha la sua pagina, con il suo indirizzo e il suo titolo: e&apos; cosi&apos;
        che un sito si fa trovare per &quot;monitor per ufficio&quot; e non solo per il proprio nome.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorie.map((categoria) => (
          <li key={categoria.id}>
            <Link
              href={categoryPath(categoria.name)}
              className="flex h-full flex-col gap-2 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <span className="flex items-center justify-between font-semibold">
                {categoria.name}
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="text-sm text-muted-foreground">{categoria.description}</span>
              <span className="mt-auto pt-2 text-xs text-muted-foreground">
                {categoria.productCount}{' '}
                {categoria.productCount === 1 ? 'articolo' : 'articoli'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
`,
  'web/app/categorie/[slug]/page.tsx': `import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategories, getProductsByCategory } from '@/lib/api'
import { categorySlug } from '@/lib/slug'
import { categoryPath, itemListJsonLd } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ProductGrid } from '@/components/ProductGrid'
import { StructuredData } from '@/components/StructuredData'

/**
 * LA PAGINA DI CATEGORIA: statica come la scheda prodotto.
 *
 * E' la stessa lista che nella SPA si ottiene con ?category=Monitor, ma qui ha un
 * indirizzo tutto suo (/categorie/monitor), un titolo tutto suo e un testo di
 * presentazione. Sono le pagine che si posizionano sulle ricerche generiche
 * ("monitor per ufficio"), dove le schede dei singoli articoli non arrivano.
 */

/** Dallo slug al nome vero: la categoria la conosce solo il backend. */
async function trovaCategoria(slug: string) {
  const categorie = await getCategories()
  return categorie.find((categoria) => categorySlug(categoria) === slug) ?? null
}

export async function generateStaticParams() {
  const categorie = await getCategories()
  return categorie.map((categoria) => ({ slug: categorySlug(categoria) }))
}

export async function generateMetadata({
  params,
}: PageProps<'/categorie/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const categoria = await trovaCategoria(slug)

  if (!categoria) {
    return { title: 'Categoria non trovata', robots: { index: false, follow: false } }
  }

  return {
    title: categoria.name,
    description: \`\${categoria.description}. \${categoria.productCount} articoli disponibili su minicommerce, con prezzi e disponibilita' aggiornati.\`,
    alternates: { canonical: categoryPath(categoria.name) },
    openGraph: {
      type: 'website',
      title: \`\${categoria.name} | minicommerce\`,
      description: categoria.description,
      url: categoryPath(categoria.name),
    },
  }
}

export default async function CategoryPage({ params }: PageProps<'/categorie/[slug]'>) {
  const { slug } = await params
  const categoria = await trovaCategoria(slug)
  if (!categoria) notFound()

  const prodotti = await getProductsByCategory(categoria.name)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <StructuredData data={itemListJsonLd(prodotti, categoria.name)} />

      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: 'Categorie', percorso: '/categorie' },
          { nome: categoria.name, percorso: categoryPath(categoria.name) },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{categoria.name}</h1>
        <p className="max-w-2xl text-muted-foreground">{categoria.description}</p>
        <p className="text-sm text-muted-foreground">
          {prodotti.length} {prodotti.length === 1 ? 'articolo' : 'articoli'} in questa categoria
        </p>
      </header>

      {prodotti.length > 0 ? (
        <ProductGrid prodotti={prodotti} />
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Questa categoria e&apos; ancora vuota.
        </p>
      )}
    </main>
  )
}
`,
  'web/app/prodotti/[slug]/page.tsx': `import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { ArrowRight, Package, Tag } from 'lucide-react'
import { APP_URL, getCacheStamp, getCatalog, getProduct } from '@/lib/api'
import { idFromSlug, productSlug } from '@/lib/slug'
import { formatDateTime, formatPrice, troncaDescrizione } from '@/lib/format'
import { categoryPath, productJsonLd, productPath } from '@/lib/seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ProductImage } from '@/components/ProductImage'
import { StructuredData } from '@/components/StructuredData'

/**
 * LA SCHEDA PRODOTTO: la pagina statica del sito, e la ragione per cui esiste
 * questa versione del progetto.
 *
 * Nella SPA /article/3 e' una pagina vuota che si riempie dopo, in JavaScript:
 * chi legge l'HTML non trova ne' il nome ne' il prezzo. Qui il nome e il prezzo
 * SONO nell'HTML, perche' Next genera queste pagine in anticipo (una per articolo,
 * elencate da generateStaticParams) e le rigenera quando i dati cambiano.
 *
 * Provate la differenza con una riga sola:
 *   curl -s http://localhost:5173/article/3 | Select-String "ThinkPad"   -> niente
 *   curl -s http://localhost:3000/prodotti/3-... | Select-String "ThinkPad" -> c'e'
 */

/**
 * L'elenco delle pagine da pregenerare. Gira durante "next build": se il backend
 * non e' avviato, qui la build si ferma. E' il patto del rendering statico, i dati
 * devono esistere prima dei visitatori.
 */
export async function generateStaticParams() {
  const prodotti = await getCatalog()
  return prodotti.map((prodotto) => ({ slug: productSlug(prodotto) }))
}

export async function generateMetadata({
  params,
}: PageProps<'/prodotti/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const id = idFromSlug(slug)
  const prodotto = id === null ? null : await getProduct(id)

  if (!prodotto) {
    return { title: 'Articolo non trovato', robots: { index: false, follow: false } }
  }

  const descrizione = troncaDescrizione(
    prodotto.description ||
      \`\${prodotto.name}\${prodotto.brand ? \` di \${prodotto.brand}\` : ''}, categoria \${prodotto.category}.\`,
  )

  return {
    title: prodotto.name,
    description: descrizione,
    // Il canonical dice a Google quale indirizzo contare quando la stessa pagina
    // e' raggiungibile da piu' URL (per esempio con uno slug vecchio).
    alternates: { canonical: productPath(prodotto) },
    openGraph: {
      type: 'website',
      title: prodotto.name,
      description: descrizione,
      url: productPath(prodotto),
      // L'immagine di anteprima la genera opengraph-image.tsx, qui accanto.
    },
  }
}

export default async function ProductPage({ params }: PageProps<'/prodotti/[slug]'>) {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (id === null) notFound()

  const prodotto = await getProduct(id)
  if (!prodotto) notFound()

  /*
   * Se il nome dell'articolo cambia, il vecchio indirizzo resta in giro (nei
   * preferiti, nei link, nell'indice di Google). L'id in testa allo slug ci permette
   * di riconoscerlo e di mandare un redirect 308 verso l'indirizzo giusto: l'utente
   * arriva dove vuole e il motore di ricerca aggiorna il suo indice.
   *
   * Alla primissima richiesta di un indirizzo mai visto il guscio statico e' gia'
   * partito con 200 e il redirect viaggia dentro lo streaming; dalla seconda in poi
   * Next ha in cache l'esito e risponde con un vero 308. Il <link rel="canonical">
   * dice comunque la verita' in entrambi i casi.
   */
  const slugCanonico = productSlug(prodotto)
  if (slug !== slugCanonico) permanentRedirect(\`/prodotti/\${slugCanonico}\`)

  const generatoIl = await getCacheStamp()

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <StructuredData data={productJsonLd(prodotto)} />

      <Breadcrumbs
        voci={[
          { nome: 'Catalogo', percorso: '/' },
          { nome: prodotto.category, percorso: categoryPath(prodotto.category) },
          { nome: prodotto.name, percorso: productPath(prodotto) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative min-h-80 overflow-hidden rounded-xl border bg-muted/40 sm:min-h-[28rem]">
          <ProductImage
            src={prodotto.imageUrl}
            alt={prodotto.name}
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
          />
        </div>

        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryPath(prodotto.category)}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:opacity-90"
              >
                <Tag className="size-3" aria-hidden="true" />
                {prodotto.category}
              </Link>
              {prodotto.brand ? (
                <span className="text-sm text-muted-foreground">{prodotto.brand}</span>
              ) : null}
            </div>

            {/* Un solo h1 per pagina, e contiene la cosa di cui parla la pagina. */}
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{prodotto.name}</h1>
            <p className="text-3xl font-bold tracking-tight">{formatPrice(prodotto.price)}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium">Disponibilit&agrave;</p>
            {prodotto.stock > 0 ? (
              <p className="text-sm text-muted-foreground">
                <span className="mr-2 rounded-full border px-2 py-0.5 text-xs text-foreground">
                  Disponibile
                </span>
                {prodotto.stock} {prodotto.stock === 1 ? 'pezzo' : 'pezzi'} in magazzino
              </p>
            ) : (
              <p className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                Al momento esaurito
              </p>
            )}
          </div>

          {/*
            Il carrello non sta qui. Aggiungere al carrello vuol dire avere un utente,
            un token e uno stato: e' lavoro da applicazione, e l'applicazione e' la SPA.
            La vetrina si ferma un passo prima e passa la mano.
          */}
          <a
            href={\`\${APP_URL}/article/\${prodotto.id}\`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:opacity-90"
          >
            Acquista nell&apos;applicazione
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Categoria</dt>
              <dd className="font-medium">{prodotto.category}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Marca</dt>
              <dd className="font-medium">{prodotto.brand || 'Non specificata'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Codice</dt>
              <dd className="font-mono text-xs">MC-{prodotto.id}</dd>
            </div>
          </dl>

          <section className="space-y-2 border-t pt-5" aria-labelledby="descrizione">
            <h2 id="descrizione" className="flex items-center gap-2 font-semibold">
              <Package className="size-4" aria-hidden="true" />
              Descrizione
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {prodotto.description || 'Nessuna descrizione disponibile per questo articolo.'}
            </p>
          </section>

          {/*
            La prova che una pagina statica non e' una pagina morta: questa data e'
            il momento in cui l'HTML e' stato generato, non il momento della visita.
            Ricaricate: non cambia. Invalidate l'etichetta 'prodotti' (vedi
            docs/WEB-NEXTJS.md) e cambia.
          */}
          <p className="border-t pt-4 text-xs text-muted-foreground">
            Dati in cache dal {formatDateTime(new Date(generatoIl))}
          </p>
        </div>
      </div>
    </main>
  )
}
`,
  'web/app/prodotti/[slug]/opengraph-image.tsx': `import { ImageResponse } from 'next/og'
import { getCatalog, getProduct } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { idFromSlug, productSlug } from '@/lib/slug'

/*
 * L'IMMAGINE DELL'ANTEPRIMA, generata una per articolo.
 *
 * Quando qualcuno incolla il link su WhatsApp, Telegram o LinkedIn, l'anteprima e'
 * questa: 1200x630 pixel disegnati da noi con nome, categoria e prezzo. Il file si
 * chiama opengraph-image e sta nella cartella della pagina: Next aggiunge da solo
 * i tag <meta property="og:image"> con l'indirizzo giusto e le dimensioni.
 *
 * Dentro ImageResponse non c'e' un browser: c'e' satori, che sa disegnare flexbox e
 * testo e nient'altro. Quindi stili inline, niente Tailwind, niente classi.
 */

export const alt = 'Scheda prodotto di minicommerce'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Anche le immagini si pregenerano: una per ogni articolo del catalogo. */
export async function generateStaticParams() {
  const prodotti = await getCatalog()
  return prodotti.map((prodotto) => ({ slug: productSlug(prodotto) }))
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = idFromSlug(slug)
  const prodotto = id === null ? null : await getProduct(id)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          backgroundColor: '#0a0a0a',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, opacity: 0.7 }}>
          minicommerce
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 28, opacity: 0.7 }}>
            {prodotto ? prodotto.category : 'Catalogo'}
          </div>
          <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.1, fontWeight: 700 }}>
            {prodotto ? prodotto.name : 'Articolo non trovato'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderTop: '2px solid #333',
            paddingTop: 32,
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.7 }}>
            {prodotto?.brand ? prodotto.brand : 'informatica e accessori'}
          </div>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 700 }}>
            {prodotto ? formatPrice(prodotto.price) : ''}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
`,
  'web/app/api/revalidate/route.ts': `import { revalidateTag } from 'next/cache'
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
 *        -d "{\\"tag\\":\\"prodotti\\"}"
 *
 * Esercizio naturale: farla chiamare dal backend dentro PUT /api/products/:id,
 * cosi' il sito si aggiorna da solo appena si salva un articolo.
 */

/** Solo etichette che usiamo davvero: non si invalida a comando quello che capita. */
const ETICHETTE_FISSE = new Set(['prodotti', 'categorie'])

function etichettaValida(tag: string): boolean {
  return ETICHETTE_FISSE.has(tag) || /^prodotto-\\d+$/.test(tag) || /^categoria-.+$/.test(tag)
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
    return Response.json({ error: \`Etichetta non ammessa: \${tag}\` }, { status: 400 })
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
    { error: 'Usare POST con l\\'intestazione x-revalidate-secret' },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
`,
  'web/components/Header.tsx': `import Link from 'next/link'
import { Cpu, LogIn, ShoppingCart } from 'lucide-react'
import { APP_URL } from '@/lib/api'

/**
 * L'intestazione della vetrina.
 *
 * Non sa chi sia l'utente, e non deve saperlo: questo HTML e' lo stesso per tutti
 * e per questo si puo' mettere in cache in una CDN. Carrello, login e area admin
 * vivono nell'applicazione React, e qui ci sono solo due link che portano la'.
 * Sono <a> e non <Link>, perche' sono un altro sito: un'altra origine, un altro
 * bundle, un'altra storia.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Cpu className="size-5" aria-hidden="true" />
          minicommerce
        </Link>
        <nav aria-label="Navigazione principale" className="flex items-center gap-1 text-sm">
          <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/">
            Catalogo
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/categorie">
            Categorie
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-accent" href="/chi-siamo">
            Chi siamo
          </Link>
          <a
            className="ml-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent"
            href={\`\${APP_URL}/cart\`}
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            Carrello
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
            href={\`\${APP_URL}/login\`}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Accedi
          </a>
        </nav>
      </div>
    </header>
  )
}
`,
  'web/components/Footer.tsx': `import Link from 'next/link'
import { getCategories, APP_URL } from '@/lib/api'
import { categoryPath } from '@/lib/seo'

/**
 * Il pie' di pagina sta nel layout, quindi compare in ogni pagina: l'elenco delle
 * categorie qui dentro e' un reticolo di link interni che fa trovare al crawler
 * tutte le pagine del sito partendo da una qualsiasi. Si chiama "internal linking"
 * ed e' uno degli interventi SEO con il miglior rapporto fra fatica e risultato.
 *
 * I dati arrivano da getCategories(), che e' "use cache": il pie' di pagina viene
 * generato una volta e riusato da tutte le pagine statiche.
 */
export async function Footer() {
  const categorie = await getCategories()

  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="font-semibold">minicommerce</p>
          <p className="text-sm text-muted-foreground">
            Il progetto del corso di Frontend Development dell&apos;ITS. Questa e&apos; la vetrina:
            sta su un server, si fa indicizzare e non ha bisogno di JavaScript per essere letta.
          </p>
        </div>
        <nav aria-label="Categorie" className="space-y-2">
          <p className="font-semibold">Categorie</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {categorie.map((categoria) => (
              <li key={categoria.id}>
                <Link className="hover:text-foreground hover:underline" href={categoryPath(categoria.name)}>
                  {categoria.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Collegamenti utili" className="space-y-2">
          <p className="font-semibold">Collegamenti</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link className="hover:text-foreground hover:underline" href="/chi-siamo">
                Chi siamo
              </Link>
            </li>
            <li>
              <a className="hover:text-foreground hover:underline" href="/sitemap.xml">
                sitemap.xml
              </a>
            </li>
            <li>
              <a className="hover:text-foreground hover:underline" href="/robots.txt">
                robots.txt
              </a>
            </li>
            <li>
              <a className="hover:text-foreground hover:underline" href={APP_URL}>
                Applicazione (SPA)
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
`,
  'web/components/ProductCard.tsx': `import Link from 'next/link'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { productPath } from '@/lib/seo'
import { ProductImage } from '@/components/ProductImage'

/**
 * La card del catalogo. Nel frontend React l'equivalente apre /article/:id dentro
 * la SPA; qui ogni card e' un link vero a una pagina vera, con il suo indirizzo e
 * il suo titolo. E' questa la differenza che si vede dal motore di ricerca.
 *
 * priority serve solo alle prime card: dice al browser di non caricarle in differita,
 * perche' sono quelle che l'utente vede subito (contano per il punteggio LCP).
 */
export function ProductCard({ prodotto, priority = false }: { prodotto: Product; priority?: boolean }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={productPath(prodotto)} className="relative block aspect-4/3 bg-muted/40">
        <ProductImage
          src={prodotto.imageUrl}
          alt={prodotto.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{prodotto.category}</p>
        <h3 className="font-medium leading-snug">
          <Link href={productPath(prodotto)} className="hover:underline">
            {prodotto.name}
          </Link>
        </h3>
        {prodotto.brand ? (
          <p className="text-sm text-muted-foreground">{prodotto.brand}</p>
        ) : null}
        <div className="mt-auto flex items-baseline justify-between pt-2">
          <span className="text-lg font-semibold">{formatPrice(prodotto.price)}</span>
          <span
            className={
              prodotto.stock > 0
                ? 'rounded-full border px-2 py-0.5 text-xs text-muted-foreground'
                : 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive'
            }
          >
            {prodotto.stock > 0 ? 'Disponibile' : 'Esaurito'}
          </span>
        </div>
      </div>
    </article>
  )
}
`,
  'web/components/ProductGrid.tsx': `import type { Product } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'

export function ProductGrid({ prodotti }: { prodotti: Product[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prodotti.map((prodotto, indice) => (
        <li key={prodotto.id}>
          <ProductCard prodotto={prodotto} priority={indice < 3} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Lo scheletro che si vede mentre la parte dinamica arriva. Con <Suspense> il
 * server manda subito l'HTML statico (intestazione, titolo, questo scheletro) e
 * spedisce i risultati dopo, nella stessa risposta: si chiama streaming.
 */
export function ProductGridSkeleton({ quante = 6 }: { quante?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: quante }, (_, indice) => (
        <li key={indice} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-4/3 animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  )
}
`,
  'web/components/ProductImage.tsx': `import Image from 'next/image'
import { Package } from 'lucide-react'

/**
 * next/image non e' solo un <img>: ridimensiona, converte in formati moderni,
 * impone width e height (quindi niente salti di layout) e carica in differita.
 * In cambio pretende di sapere da quali host puo' scaricare: vedi remotePatterns
 * in next.config.ts.
 *
 * Nel nostro seed imageUrl e' sempre null, quindi il caso "nessuna immagine" non e'
 * un dettaglio: e' il caso normale, e va disegnato bene.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string | null
  alt: string
  sizes: string
  priority?: boolean
}) {
  if (!src) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Package className="size-10 stroke-1" aria-hidden="true" />
        <span className="text-xs">Immagine non disponibile</span>
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-contain p-4"
    />
  )
}
`,
  'web/components/FilterForm.tsx': `import Link from 'next/link'
import { Search } from 'lucide-react'
import type { Category, ProductFilters } from '@/lib/api'

const CAMPO =
  'h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * I filtri, senza una riga di JavaScript.
 *
 * Nel frontend React questo pannello e' uno stato del componente tenuto in sincronia
 * con useSearchParams. Qui e' un <form method="get">: il browser compone la query
 * string da solo, il server riceve ?search=...&category=... e risponde con l'HTML
 * giusto. Funziona con JavaScript disattivato, funziona dentro un crawler, e si
 * puo' copiare e incollare come link.
 *
 * Il prezzo da pagare: i campi vuoti finiscono comunque nell'URL (?search=&brand=).
 * Il backend li ignora, ma per i motori di ricerca sono indirizzi diversi che
 * mostrano la stessa pagina. Per questo la pagina filtrata dichiara noindex e un
 * canonical che punta al catalogo pulito (vedi app/page.tsx).
 */
export function FilterForm({
  categorie,
  valori,
}: {
  categorie: Category[]
  valori: ProductFilters
}) {
  return (
    <form method="get" action="/" className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="mb-1 block text-sm font-medium">
            Cerca
          </label>
          <input
            id="search"
            name="search"
            type="search"
            className={CAMPO}
            placeholder="nome, descrizione o marca"
            defaultValue={valori.search ?? ''}
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium">
            Categoria
          </label>
          <select id="category" name="category" className={CAMPO} defaultValue={valori.category ?? ''}>
            <option value="">Tutte le categorie</option>
            {categorie.map((categoria) => (
              <option key={categoria.id} value={categoria.name}>
                {categoria.name} ({categoria.productCount})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="minPrice" className="mb-1 block text-sm font-medium">
              Da (&euro;)
            </label>
            <input
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              step="1"
              className={CAMPO}
              defaultValue={valori.minPrice ?? ''}
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="mb-1 block text-sm font-medium">
              A (&euro;)
            </label>
            <input
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              step="1"
              className={CAMPO}
              defaultValue={valori.maxPrice ?? ''}
            />
          </div>
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block text-sm font-medium">
            Ordina per
          </label>
          <select id="sort" name="sort" className={CAMPO} defaultValue={valori.sort ?? 'name'}>
            <option value="name">Nome</option>
            <option value="price">Prezzo</option>
            <option value="stock">Disponibilit&agrave;</option>
            <option value="createdAt">Novit&agrave;</option>
          </select>
        </div>
        <div>
          <label htmlFor="order" className="mb-1 block text-sm font-medium">
            Direzione
          </label>
          <select id="order" name="order" className={CAMPO} defaultValue={valori.order ?? 'asc'}>
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Search className="size-4" aria-hidden="true" />
            Applica i filtri
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent"
          >
            Azzera
          </Link>
        </div>
      </div>
    </form>
  )
}
`,
  'web/components/Breadcrumbs.tsx': `import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StructuredData } from '@/components/StructuredData'
import { breadcrumbJsonLd } from '@/lib/seo'

/**
 * Le briciole di pane servono due volte: all'utente, che capisce dove si trova, e
 * al motore di ricerca, che nel risultato mostra "minicommerce > Monitor > ..."
 * invece dell'URL. Per questo insieme alla lista disegnata stampiamo anche il
 * JSON-LD BreadcrumbList: stessa informazione, due pubblici.
 */
export function Breadcrumbs({ voci }: { voci: Array<{ nome: string; percorso: string }> }) {
  return (
    <>
      <StructuredData data={breadcrumbJsonLd(voci)} />
      <nav aria-label="Percorso di navigazione">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {voci.map((voce, indice) => {
            const ultima = indice === voci.length - 1
            return (
              <li key={voce.percorso} className="flex items-center gap-1">
                {ultima ? (
                  <span aria-current="page" className="text-foreground">
                    {voce.nome}
                  </span>
                ) : (
                  <>
                    <Link href={voce.percorso} className="hover:text-foreground hover:underline">
                      {voce.nome}
                    </Link>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
`,
  'web/components/StructuredData.tsx': `/**
 * Un oggetto JavaScript diventa un blocco <script type="application/ld+json">.
 *
 * dangerouslySetInnerHTML qui e' obbligato: React non puo' mettere testo dentro
 * uno <script>. Il rischio e' reale, quindi lo chiudiamo a mano: se una descrizione
 * contenesse "</script>" il browser chiuderebbe il blocco e il resto diventerebbe
 * HTML eseguibile. Sostituendo "<" con la sua forma < il JSON resta valido e
 * il tag non si puo' chiudere per sbaglio.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
`,
  'web/lib/api.ts': `/**
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
export const API_URL = (process.env.API_URL ?? 'http://localhost:3001/api').replace(/\\/+$/, '')

/** Dove vive la SPA: carrello, login e area admin restano la' (vedi docs/WEB-NEXTJS.md). */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173'
).replace(/\\/+$/, '')

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
  const indirizzo = \`\${API_URL}\${percorso}\`
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
      \`Non riesco a contattare l'API su \${indirizzo}. Il backend e' avviato? (cd backend && npm run dev)\`,
      { cause: errore },
    )
  }
  if (risposta.status === 404 && accettaMancante) return null
  if (!risposta.ok) {
    throw new Error(\`\${indirizzo} ha risposto \${risposta.status} \${risposta.statusText}\`)
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
  cacheTag('prodotti', \`prodotto-\${id}\`)
  cacheLife('hours')
  return chiamaApi<Product>(\`/products/\${id}\`, true)
}

export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheTag('categorie')
  cacheLife('hours')
  return (await chiamaApi<Category[]>('/categories')) ?? []
}

export async function getProductsByCategory(nomeCategoria: string): Promise<Product[]> {
  'use cache'
  cacheTag('prodotti', \`categoria-\${nomeCategoria}\`)
  cacheLife('hours')
  const query = new URLSearchParams({ category: nomeCategoria, sort: 'name', order: 'asc' })
  return (await chiamaApi<Product[]>(\`/products?\${query}\`)) ?? []
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
  const coda = query.size > 0 ? \`?\${query}\` : ''
  return (await chiamaApi<Product[]>(\`/products\${coda}\`)) ?? []
}
`,
  'web/lib/seo.ts': `/**
 * Tutto quello che serve ai motori di ricerca, in un posto solo.
 *
 * Due cose diverse, da non confondere:
 *  - i META TAG (title, description, canonical, Open Graph): servono a chi legge
 *    il risultato di ricerca o l'anteprima su WhatsApp. Li produce generateMetadata().
 *  - i DATI STRUTTURATI (JSON-LD): servono alla macchina. Dicono "questa pagina
 *    descrive un prodotto, che costa 1899 euro e che e' disponibile". Sono quelli
 *    che possono far comparire il prezzo direttamente nei risultati di Google.
 */
import type { Product } from '@/lib/api'
import { productSlug, categorySlug } from '@/lib/slug'
import { troncaDescrizione } from '@/lib/format'

/**
 * L'indirizzo pubblico del sito. Serve assoluto: un URL canonico o un'immagine
 * Open Graph relativa non vuol dire niente per un crawler o per WhatsApp.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\\/+$/, '')

export const SITE_NAME = 'minicommerce'
export const SITE_DESCRIPTION =
  'Portatili, monitor, tastiere e accessori per chi lavora e studia al computer. ' +
  'Schede chiare, prezzi aggiornati, nessuna sorpresa al carrello.'

export function absoluteUrl(percorso: string): string {
  return \`\${SITE_URL}\${percorso.startsWith('/') ? percorso : \`/\${percorso}\`}\`
}

export function productPath(prodotto: Pick<Product, 'id' | 'name'>): string {
  return \`/prodotti/\${productSlug(prodotto)}\`
}

export function categoryPath(nome: string): string {
  return \`/categorie/\${categorySlug({ name: nome })}\`
}

/** Chi siamo, in forma leggibile da una macchina. Va messo una volta sola, nel layout. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: absoluteUrl('/hero.png'),
    areaServed: 'IT',
    currenciesAccepted: 'EUR',
  }
}

/** Il sito con la sua ricerca interna: dice a Google come cercare dentro di noi. */
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'it-IT',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: \`\${SITE_URL}/?search={search_term_string}\`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * La scheda prodotto. Niente recensioni e niente stelline inventate: i dati
 * strutturati devono dire la verita' su quello che c'e' nella pagina, altrimenti
 * Google li ignora (e nei casi peggiori declassa il sito).
 */
export function productJsonLd(prodotto: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prodotto.name,
    description: troncaDescrizione(prodotto.description, 300),
    sku: \`MC-\${prodotto.id}\`,
    category: prodotto.category,
    url: absoluteUrl(productPath(prodotto)),
    ...(prodotto.brand ? { brand: { '@type': 'Brand', name: prodotto.brand } } : {}),
    ...(prodotto.imageUrl ? { image: [prodotto.imageUrl] } : {}),
    offers: {
      '@type': 'Offer',
      price: prodotto.price.toFixed(2),
      priceCurrency: 'EUR',
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        prodotto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(productPath(prodotto)),
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  }
}

/** Le briciole di pane: compaiono anche nel risultato di ricerca, al posto dell'URL. */
export function breadcrumbJsonLd(voci: Array<{ nome: string; percorso: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: voci.map((voce, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: voce.nome,
      item: absoluteUrl(voce.percorso),
    })),
  }
}

/** Un elenco di prodotti (pagina di categoria): l'ordine conta. */
export function itemListJsonLd(prodotti: Product[], nome: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nome,
    numberOfItems: prodotti.length,
    itemListElement: prodotti.map((prodotto, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      url: absoluteUrl(productPath(prodotto)),
      name: prodotto.name,
    })),
  }
}
`,
  'web/lib/slug.ts': `/**
 * Gli URL di un sito vetrina sono contenuto, non dettagli tecnici: /prodotti/3 non
 * dice niente a chi legge (ne' a un motore di ricerca), /prodotti/3-mouse-mx-master-4 si'.
 * Teniamo l'id davanti allo slug: il nome del prodotto puo' cambiare, l'id no, e con
 * l'id in testa la pagina si trova sempre anche dopo una rinomina.
 */

/** "Cuffie Sony WH-1000XM6" -> "cuffie-sony-wh-1000xm6" */
export function slugify(testo: string): string {
  return testo
    .normalize('NFD') // separa le lettere dai segni diacritici
    .replace(/[̀-ͯ]/g, '') // via gli accenti: "à" -> "a"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // tutto il resto diventa un separatore
    .replace(/^-+|-+$/g, '')
}

export function productSlug(prodotto: { id: number; name: string }): string {
  return \`\${prodotto.id}-\${slugify(prodotto.name)}\`
}

export function categorySlug(categoria: { name: string }): string {
  return slugify(categoria.name)
}

/** Dallo slug torniamo all'id: tutto quello che viene dopo e' decorazione leggibile. */
export function idFromSlug(slug: string): number | null {
  const trovato = /^(\\d+)(?:-|$)/.exec(slug)
  if (!trovato) return null
  const id = Number(trovato[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
`,
  'web/lib/format.ts': `/** Gli stessi formati del frontend React: prezzi in euro, date in italiano. */

export const formatPrice = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
}).format

export const formatDateTime = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format

/**
 * La meta description che Google mostra sotto il titolo viene tagliata intorno ai
 * 160 caratteri: meglio tagliarla noi su una parola intera che farla troncare a meta'.
 */
export function troncaDescrizione(testo: string, massimo = 155): string {
  const pulito = testo.replace(/\\s+/g, ' ').trim()
  if (pulito.length <= massimo) return pulito
  const tagliato = pulito.slice(0, massimo)
  const ultimoSpazio = tagliato.lastIndexOf(' ')
  return \`\${(ultimoSpazio > 60 ? tagliato.slice(0, ultimoSpazio) : tagliato).trimEnd()}...\`
}
`,
  'scripts/confronto-seo.mjs': `#!/usr/bin/env node
// -----------------------------------------------------------------------------
// confronto-seo.mjs
//
// Mette una accanto all'altra la stessa scheda prodotto vista da un crawler:
// una volta nella SPA (Vite) e una volta nella vetrina (Next).
//
// Non misura la bellezza e non misura la velocita': misura cosa c'e' SCRITTO
// nell'HTML che il server ha spedito, prima che il browser esegua JavaScript.
// E' esattamente quello che legge Googlebot al primo passaggio.
//
// Uso:
//   node scripts/confronto-seo.mjs
//   node scripts/confronto-seo.mjs --id 3
//   node scripts/confronto-seo.mjs --spa http://localhost:5173 --vetrina http://localhost:3000
//
// Prerequisiti: backend avviato, e almeno uno dei due frontend in ascolto.
// -----------------------------------------------------------------------------

import process from 'node:process'

function argomento(nome, predefinito) {
  const indice = process.argv.indexOf(\`--\${nome}\`)
  return indice !== -1 && process.argv[indice + 1] ? process.argv[indice + 1] : predefinito
}

const API = argomento('api', 'http://localhost:3001/api').replace(/\\/+$/, '')
const SPA = argomento('spa', 'http://localhost:5173').replace(/\\/+$/, '')
const VETRINA = argomento('vetrina', 'http://localhost:3000').replace(/\\/+$/, '')
const ID = Number(argomento('id', '1'))

/** La stessa funzione di web/lib/slug.ts: qui la ripetiamo per non dipendere da nulla. */
function slugify(testo) {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function scarica(indirizzo) {
  const inizio = Date.now()
  try {
    const risposta = await fetch(indirizzo, { headers: { Accept: 'text/html' } })
    const html = await risposta.text()
    return { ok: true, stato: risposta.status, html, ms: Date.now() - inizio }
  } catch (errore) {
    return { ok: false, errore: errore.message, html: '', ms: Date.now() - inizio }
  }
}

/** Via script, style e tag: resta il testo che un lettore (o un crawler) vede. */
function soloTesto(html) {
  return html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
    .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
}

function primoGruppo(html, espressione) {
  const trovato = espressione.exec(html)
  return trovato ? trovato[1].trim() : null
}

function analizza(html) {
  return {
    titolo: primoGruppo(html, /<title[^>]*>([^<]*)<\\/title>/i),
    descrizione: primoGruppo(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    canonical: primoGruppo(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
    h1: primoGruppo(html, /<h1[^>]*>([\\s\\S]*?)<\\/h1>/i)?.replace(/<[^>]+>/g, '').trim() ?? null,
    jsonLd: (html.match(/<script[^>]+application\\/ld\\+json/gi) ?? []).length,
    link: (html.match(/<a\\s[^>]*href=/gi) ?? []).length,
    parole: soloTesto(html).split(' ').filter(Boolean).length,
    byte: Buffer.byteLength(html, 'utf8'),
  }
}

function riga(etichetta, sinistra, destra) {
  const testo = (valore) => {
    if (valore === null || valore === undefined) return '-'
    const stringa = String(valore)
    return stringa.length > 46 ? \`\${stringa.slice(0, 43)}...\` : stringa
  }
  console.log(\`\${etichetta.padEnd(16)} | \${testo(sinistra).padEnd(46)} | \${testo(destra)}\`)
}

// --------------------------------------------------------------------------- //

const risposta = await fetch(\`\${API}/products/\${ID}\`).catch(() => null)
if (!risposta || !risposta.ok) {
  console.error(\`\\nNon riesco a leggere \${API}/products/\${ID}.\`)
  console.error('Il backend e\\' avviato?  cd backend && npm run dev\\n')
  process.exit(1)
}
const prodotto = await risposta.json()
const slug = \`\${prodotto.id}-\${slugify(prodotto.name)}\`

const indirizzoSpa = \`\${SPA}/article/\${prodotto.id}\`
const indirizzoVetrina = \`\${VETRINA}/prodotti/\${slug}\`

console.log(\`\\nArticolo \${prodotto.id}: \${prodotto.name}\`)
console.log(\`SPA      \${indirizzoSpa}\`)
console.log(\`Vetrina  \${indirizzoVetrina}\\n\`)

const [spa, vetrina] = await Promise.all([scarica(indirizzoSpa), scarica(indirizzoVetrina)])

for (const [nome, esito] of [
  ['SPA', spa],
  ['vetrina', vetrina],
]) {
  if (!esito.ok) console.log(\`! \${nome} non risponde: \${esito.errore}\`)
}

const a = analizza(spa.html)
const b = analizza(vetrina.html)

console.log('-'.repeat(100))
riga('', 'SPA (Vite)', 'Vetrina (Next)')
console.log('-'.repeat(100))
riga('stato', spa.stato, vetrina.stato)
riga('tempo', \`\${spa.ms} ms\`, \`\${vetrina.ms} ms\`)
riga('byte di HTML', a.byte, b.byte)
riga('<title>', a.titolo, b.titolo)
riga('description', a.descrizione, b.descrizione)
riga('canonical', a.canonical, b.canonical)
riga('<h1>', a.h1, b.h1)
riga('blocchi JSON-LD', a.jsonLd, b.jsonLd)
riga('link <a href>', a.link, b.link)
riga('parole di testo', a.parole, b.parole)
riga(
  'nome articolo',
  spa.html.includes(prodotto.name) ? 'presente' : 'ASSENTE',
  vetrina.html.includes(prodotto.name) ? 'presente' : 'ASSENTE',
)
riga(
  'prezzo',
  spa.html.includes(String(prodotto.price)) ? 'presente' : 'ASSENTE',
  vetrina.html.includes(prodotto.price.toFixed(2)) || vetrina.html.includes(String(prodotto.price))
    ? 'presente'
    : 'ASSENTE',
)
console.log('-'.repeat(100))
console.log(
  '\\nLa SPA non sta sbagliando niente: fa il suo mestiere, che e\\' far USARE' +
    "\\nl'applicazione. Solo che il contenuto arriva dopo, in JavaScript, e in questo" +
    '\\nHTML non c\\'e\\'. La vetrina fa il mestiere opposto: farsi LEGGERE.\\n',
)
`,
}

// --------------------------------------------------------------------------- //
// 1. Controlli preliminari                                                    //
// --------------------------------------------------------------------------- //

titolo('Controlli preliminari')

for (const atteso of ['frontend/package.json', 'backend/package.json', 'frontend/src/lib/api.ts']) {
  if (!fs.existsSync(assoluto(atteso))) {
    errore(`non trovo ${atteso}: esegui lo script dalla radice del repository minicommerce.`)
  }
}
const maggiore = Number(process.versions.node.split('.')[0])
if (maggiore < 22) errore(`Next 16 vuole Node 22 o superiore (trovato ${process.versions.node}).`)
info(`repository: ${RADICE}`)
info(`Node ${process.versions.node}`)
if (FORZA) info('--forza: i file generati verranno riscritti')

// --------------------------------------------------------------------------- //
// 2. Il guscio, dalla CLI ufficiale                                           //
// --------------------------------------------------------------------------- //

titolo('Il guscio Next.js in web/')

const giaGenerato = fs.existsSync(assoluto('web/package.json'))

if (giaGenerato) {
  info("web/package.json c'e' gia': salto create-next-app")
} else {
  // Le opzioni sono quelle che a mano sceglieremmo nelle domande della CLI:
  //   TypeScript si, App Router si, Tailwind si, cartella src no, alias "@/*".
  // --skip-install perche' installiamo una volta sola al passo 6, dopo aver
  // aggiunto lucide-react.
  esegui(
    NPX,
    [
      '-y',
      'create-next-app@latest',
      'web',
      '--ts',
      '--app',
      '--tailwind',
      '--no-src-dir',
      '--import-alias',
      '"@/*"',
      '--use-npm',
      '--skip-install',
      '--disable-git',
      '--no-agent-feedback',
      '--yes',
    ],
    RADICE,
  )
}

// --------------------------------------------------------------------------- //
// 3. Via i file di esempio                                                    //
// --------------------------------------------------------------------------- //

titolo('Via la pagina di esempio del generatore')

if (giaGenerato) {
  info("il guscio esisteva gia': non tocco niente")
} else {
  // Questi li riscriviamo tutti al passo 4: meglio cancellarli, cosi' nel repository
  // non resta niente del progetto di esempio.
  for (const file of [
    'web/app/page.tsx',
    'web/app/layout.tsx',
    'web/app/globals.css',
    'web/app/favicon.ico',
    'web/next.config.ts',
    'web/README.md',
    'web/public/next.svg',
    'web/public/vercel.svg',
    'web/public/window.svg',
    'web/public/file.svg',
    'web/public/globe.svg',
  ]) {
    elimina(file)
  }
}

// --------------------------------------------------------------------------- //
// 4. I file della vetrina                                                     //
// --------------------------------------------------------------------------- //

titolo('I file della vetrina')

for (const [relativo, contenuto] of Object.entries(SORGENTI)) {
  crea(relativo, contenuto)
}

// L'immagine e' la stessa della SPA: un progetto, un'identita'.
copia('frontend/src/assets/hero.png', 'web/public/hero.png')
copia('frontend/src/assets/hero.png', 'web/app/icon.png')

// Le icone di lucide, le stesse della SPA.
aggiungiDipendenze('web/package.json', { 'lucide-react': '^1.46.0' })

// --------------------------------------------------------------------------- //
// 5. Variabili d'ambiente                                                     //
// --------------------------------------------------------------------------- //

titolo("Variabili d'ambiente")

// .env.example si committa (documenta), .env.local no (contiene i valori veri).
if (!fs.existsSync(assoluto('web/.env.local'))) {
  fs.copyFileSync(assoluto('web/.env.example'), assoluto('web/.env.local'))
  info('+ web/.env.local (copia di .env.example, non va nel repository)')
} else {
  info("= web/.env.local esiste gia'")
}

aggiungiRiga('web/.gitignore', [
  '',
  '# Il file di esempio invece si committa: documenta le variabili senza rivelarle.',
  '!.env.example',
])

// --------------------------------------------------------------------------- //
// 6. Installazione                                                            //
// --------------------------------------------------------------------------- //

titolo('Installazione delle dipendenze')

if (SALTA_INSTALL) {
  info('--salta-install: salto npm install')
} else {
  esegui(NPM, ['install'], assoluto('web'))
}

// --------------------------------------------------------------------------- //
// 7. Build                                                                    //
// --------------------------------------------------------------------------- //

titolo('Build del sito')

if (SALTA_BUILD || SALTA_INSTALL) {
  info('salto npm run build')
} else if (await apiViva()) {
  info(`l'API risponde su ${API_URL}: si possono pregenerare le pagine`)
  esegui(NPM, ['run', 'build'], assoluto('web'))
} else {
  avviso(
    `l'API non risponde su ${API_URL}.\n` +
      '      Le pagine statiche nascono dai dati, quindi la build ha bisogno del backend:\n' +
      '          cd backend && npm run dev\n' +
      '      poi:\n' +
      '          cd web && npm run build',
  )
}

// --------------------------------------------------------------------------- //
// Riepilogo                                                                   //
// --------------------------------------------------------------------------- //

console.log('\n' + '-'.repeat(78))
console.log(`File creati: ${creati.length}    file modificati: ${modificati.length}`)
console.log('-'.repeat(78))
console.log(`
minicommerce ha una vetrina. Come si avvia:

  1. cd backend && npm run dev        l'API su :3001 (serve anche al sito)
  2. cd web     && npm run dev        il sito su :3000
     cd web     && npm run build      le pagine statiche, come in produzione
     cd web     && npm start          e le serve

  Per il confronto con la SPA, in un terzo terminale:

  3. cd frontend && npm run dev       la SPA su :5173
     node scripts/confronto-seo.mjs   la stessa pagina vista da un crawler

Documentazione: docs/WEB-NEXTJS.md
`)
