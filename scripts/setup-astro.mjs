#!/usr/bin/env node
// -----------------------------------------------------------------------------
// setup-astro.mjs
//
// Aggiunge a minicommerce il suo modulo di contenuti: un blog generato con Astro,
// collegato al negozio ma indipendente da lui.
//
// Esegue da solo tutti i comandi spiegati a lezione:
//   1. controlli preliminari
//   2. npm create astro@latest blog ...        (il guscio, dalla CLI ufficiale)
//   3. npx astro add react sitemap tailwind    (le integrazioni, con i comandi veri)
//   4. i file del blog (post, pagine, componenti, isola)
//   5. le variabili d'ambiente e il link dal negozio al blog
//   6. npm run build
//
// Uso:  node scripts/setup-astro.mjs [--forza] [--salta-install] [--salta-build]
//
// Solo moduli "node:", nessuna dipendenza esterna. Idempotente: se un file c'e'
// gia' non viene sovrascritto (--forza per riscriverlo).
//
// NOTA: il backend non e' obbligatorio. Il blog si costruisce anche senza, solo le
// schede prodotto nei post restano senza prezzo (ed e' una scelta, vedi
// blog/src/lib/shop.ts).
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

let passo = 0
const creati = []
const modificati = []

// --------------------------------------------------------------------------- //
// Utilita' di stampa ed esecuzione                                            //
// --------------------------------------------------------------------------- //

function titolo(testo) {
  passo += 1
  console.log(`\n[${passo}/6] ${testo}`)
}

function info(testo) {
  console.log(`      ${testo}`)
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

function leggi(relativo) {
  const percorso = assoluto(relativo)
  if (!fs.existsSync(percorso)) errore(`file mancante: ${relativo}`)
  return fs.readFileSync(percorso, 'utf8')
}

/** Allinea i fine riga del testo da cercare/scrivere a quelli del file. */
function adatta(testo, originale) {
  return originale.includes('\r\n') ? testo.replace(/\n/g, '\r\n') : testo
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

/**
 * Sostituzione testuale mirata e verificata: se il testo atteso non c'e' si ferma,
 * se la patch e' gia' presente non fa niente.
 */
function patch(relativo, atteso, nuovo, nota) {
  const percorso = assoluto(relativo)
  const originale = leggi(relativo)
  const cercato = adatta(atteso, originale)
  const sostituto = adatta(nuovo, originale)

  if (originale.includes(sostituto)) {
    info(`= ${relativo}: ${nota} (gia' applicata)`)
    return false
  }
  const occorrenze = originale.split(cercato).length - 1
  if (occorrenze === 0) {
    errore(
      `in ${relativo} non trovo il testo da sostituire (${nota}).\n` +
        `Atteso:\n---\n${atteso}\n---\n` +
        "Il file e' stato modificato a mano? Riparti da un clone pulito di master.",
    )
  }
  if (occorrenze > 1) {
    errore(
      `in ${relativo} il testo da sostituire (${nota}) compare ${occorrenze} volte: patch ambigua.`,
    )
  }
  fs.writeFileSync(percorso, originale.replace(cercato, sostituto))
  info(`~ ${relativo}: ${nota}`)
  if (!modificati.includes(relativo)) modificati.push(relativo)
  return true
}

// --------------------------------------------------------------------------- //
// I file del blog                                                             //
// --------------------------------------------------------------------------- //

/**
 * Tutti i file del blog, uno dietro l'altro: configurazione, schema dei
 * contenuti, i sei post, le pagine, i componenti e la sola isola React.
 *
 * Sono gli stessi che trovate in blog/ sul ramo web/astro: qui stanno dentro lo
 * script perche' deve bastare questo file per passare dalla versione senza blog a
 * quella con il blog, senza scaricare nient'altro.
 */
const SORGENTI = {
  'blog/astro.config.mjs': `// @ts-check
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  /*
   * site e' obbligatorio, non e' un vezzo: la sitemap e il feed RSS contengono
   * indirizzi assoluti, e un indirizzo assoluto non si puo' inventare. In
   * produzione si passa SITE_URL, altrimenti vale il server di sviluppo.
   */
  site: process.env.SITE_URL ?? 'http://localhost:4321',

  // Il valore predefinito. Lo scriviamo per dire una cosa sola: qui non c'e'
  // nessun server. "astro build" produce una cartella di file HTML, e quella
  // cartella si pubblica dove si vuole, anche su un hosting che non sa cosa sia Node.
  output: 'static',

  integrations: [
    // React serve a una cosa sola, in una pagina sola: l'isola del prezzo dal vivo.
    react(),
    // Genera sitemap-index.xml partendo dalle pagine che ha davvero costruito.
    sitemap(),
  ],

  vite: {
    // Lo stesso plugin di Tailwind v4 che usiamo nella SPA: qui dentro c'e' Vite.
    plugins: [tailwindcss()],
  },
})
`,
  'blog/README.md': `# blog/ - il blog di minicommerce (Astro)

Il modulo di contenuti del progetto: guide all'acquisto scritte in Markdown e
trasformate in file HTML una volta sola, al momento della pubblicazione.

Non e' un pezzo del negozio e non ne dipende: \`astro build\` produce una cartella
\`dist/\` di file statici che si pubblica anche su un hosting che non sa cosa sia
Node. L'unico filo che lo lega al catalogo e' il campo \`prodotti\` nel frontmatter
dei post, con cui ogni articolo cita gli articoli del negozio di cui parla.

| | \`frontend/\` (SPA) | \`blog/\` (Astro) |
|---|---|---|
| Cosa contiene | funzioni | contenuti |
| JavaScript nella pagina | tutta l'applicazione | zero, tranne un'isola |
| Dove vivono i dati | nel database, via API | in file Markdown nel repository |
| Quando si costruisce la pagina | nel browser, a ogni visita | una volta, in fase di build |
| Chi la aggiorna | l'amministratore, dall'app | chi scrive, con una pull request |

## Avvio rapido

\`\`\`bash
cd blog && npm run dev            # il blog su :4321
cd backend && npm run dev         # opzionale: serve solo per i prezzi nei post
\`\`\`

\`\`\`bash
npm run build && npm run preview  # le pagine statiche vere, come in produzione
\`\`\`

## La mappa

\`\`\`
src/
  content.config.ts        la forma del frontmatter: un errore ferma la build
  content/blog/*.md        i sei articoli
  layouts/BaseLayout.astro testa della pagina, metadati, JSON-LD
  components/
    PrezzoLive.tsx         l'unica isola React del sito: il prezzo dal vivo
    ProductCard.astro      la scheda di un articolo del catalogo
  lib/shop.ts              legge il catalogo dall'API, solo in fase di build
  pages/
    index.astro            l'elenco degli articoli
    blog/[...slug].astro   una pagina per post
    tag/[tag].astro        una pagina per argomento
    rss.xml.ts             il feed
    robots.txt.ts          robots.txt generato con l'indirizzo giusto
\`\`\`

Tutto il resto - prerequisiti, esperimenti da fare a lezione, quando conviene Astro
e quando conviene Next - sta in [\`docs/WEB-ASTRO.md\`](../docs/WEB-ASTRO.md).
`,
  'blog/.env.example': `# L API di minicommerce, letta durante "astro build" (non dal browser).
API_URL=http://localhost:3001/api

# La stessa API vista dal browser: serve all isola del prezzo dal vivo.
# Il prefisso PUBLIC_ e la regola di Astro: senza di esso la variabile resta sul server.
PUBLIC_API_URL=http://localhost:3001/api

# Dove gira la SPA React: i link "vai alla scheda" portano la.
PUBLIC_APP_URL=http://localhost:5173

# L indirizzo pubblico del blog: finisce in canonical, sitemap e feed RSS.
# Lo legge astro.config.mjs; in produzione va cambiato.
SITE_URL=http://localhost:4321
`,
  'blog/src/content.config.ts': `import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

/**
 * LA COLLEZIONE DI CONTENUTI.
 *
 * Qui si dichiara che esistono dei post, dove stanno e che forma ha il loro
 * frontmatter. Da questo momento due cose diventano vere:
 *
 *  1. Astro genera i tipi TypeScript: nelle pagine, post.data.title e' una stringa
 *     e post.data.pubDate e' una Date, con l'autocompletamento.
 *  2. Un frontmatter sbagliato ferma la BUILD, non il visitatore. Scrivete "pubdate"
 *     invece di "pubDate" e il messaggio d'errore vi dice file, campo e motivo.
 *
 * I limiti sulla description non sono pignoleria: sotto i 50 caratteri non dice
 * niente, sopra i 160 Google la taglia. Il controllo e' qui una volta per tutte,
 * invece di essere una buona intenzione in fondo a una checklist.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(10).max(70),
    description: z.string().min(50).max(160),
    pubDate: z.coerce.date(),
    author: z.string().default('Redazione minicommerce'),
    tags: z.array(z.string()).min(1),
    /** Gli id degli articoli del catalogo di cui parla il post (vedi src/lib/shop.ts). */
    prodotti: z.array(z.number().int().positive()).default([]),
    bozza: z.boolean().default(false),
  }),
})

export const collections = { blog }
`,
  'blog/src/content/blog/portatile-per-studiare-informatica.md': `---
title: "Che portatile serve per studiare informatica"
description: "Due macchine molto diverse, 550 euro di differenza e una domanda sola: cosa ci farete davvero sopra nei prossimi tre anni."
pubDate: 2026-09-15
tags: ["guide", "portatili"]
prodotti: [1, 2]
---

La domanda arriva ogni settembre e la risposta non è il modello: è l'uso. Un
portatile per studiare informatica deve fare tre cose, e due di queste non si
leggono nella scheda tecnica.

## La tastiera, perché ci scriverete sopra per mille ore

Un corso di sviluppo sono migliaia di righe di codice battute a mano. Prima del
processore guardate la corsa dei tasti e la posizione di parentesi, graffe e
backtick sul layout italiano. Se potete, provatela in negozio per cinque minuti:
sono i cinque minuti meglio spesi dell'acquisto.

## La memoria, perché è l'unica cosa che non si aggiunge dopo

Un browser con quindici schede, un editor, un server di sviluppo, un container e
un emulatore Android convivono, ma non in 8 GB. Oggi 16 GB sono il minimo
sensato, 32 GB sono tranquillità per tutto il corso. Su quasi tutti gli ultrabook
la RAM è saldata: quella che comprate è quella che avrete fra tre anni.

## L'autonomia, perché un'aula non ha una presa per ciascuno

Una giornata di lezione sono sei ore lontano dal caricabatterie. È qui che le due
macchine di cui parliamo si dividono: una scalda meno e dura di più, l'altra apre
più porte e si ripara più facilmente.

## Le due scelte, in concreto

Il **ThinkPad X1 Carbon** è la scelta di chi vuole Linux senza sorprese, due
porte USB-A che evitano l'adattatore e una tastiera che è un riferimento del
settore. Il **MacBook Air M4** è silenzioso perché non ha ventole, dura una
giornata intera e compila in fretta; in cambio vi servirà un hub il primo giorno
e la riparabilità è quella che è.

Nessuna delle due è sbagliata. Sbagliata è la terza via: risparmiare 300 euro sul
portatile e passare tre anni ad aspettare.
`,
  'blog/src/content/blog/postazione-per-otto-ore.md': `---
title: "La postazione per stare otto ore al computer"
description: "Monitor all'altezza degli occhi, tastiera che non obbliga a piegare i polsi, mouse che sta nella mano: la differenza si sente dopo un mese."
pubDate: 2026-09-29
tags: ["guide", "accessori", "monitor"]
prodotti: [10, 7, 5]
---

Il computer è quello che è. Quello che potete cambiare è tutto il resto, e costa
meno di quanto pensiate.

## Il monitor va alzato, non avvicinato

Il bordo superiore dello schermo deve stare all'altezza dei vostri occhi. Se il
monitor è appoggiato sulla scrivania e guardate in basso, dopo un mese il collo
presenta il conto. Due libri sotto la base risolvono gratis; un braccio
regolabile risolve meglio.

Sulla diagonale: un 27 pollici QHD è il punto d'equilibrio per lavorare. Un 32
pollici 4K con USB-C fa una cosa in più che si apprezza ogni mattina: collega il
portatile con un cavo solo e nel frattempo lo ricarica.

## La tastiera: il problema non è la velocità, è l'angolo

Le mani devono stare in linea con gli avambracci. Una tastiera spessa e inclinata
verso l'alto obbliga a piegare i polsi indietro per tutto il giorno. Cercate un
profilo basso, e se usate il tastierino numerico una volta al mese, togliete il
tastierino: il mouse torna più vicino al corpo e la spalla ringrazia.

## Il mouse: la forma conta più dei DPI

Se la mano appoggia tutta e il pollice ha dove stare, quasi tutto il resto è
marketing. Un mouse grande non va bene a tutti: misurate la vostra mano dal
polso alla punta del medio e confrontatela con le dimensioni dichiarate.

## E la sedia?

La sedia non la vendiamo, ma è la voce su cui vale la pena spendere di più. Una
regola che funziona: piedi a terra, ginocchia a novanta gradi, schiena
appoggiata. Se mancano tutte e tre, nessun accessorio di questa pagina vi salverà.
`,
  'blog/src/content/blog/tastiera-meccanica-o-membrana.md': `---
title: "Tastiera meccanica o a membrana: come scegliere"
description: "Il rumore, la corsa dei tasti, il prezzo e la convivenza con chi vi sta accanto: quattro criteri concreti invece delle solite guerre di religione."
pubDate: 2026-10-06
tags: ["guide", "tastiere"]
prodotti: [8, 7]
---

Chi ha una tastiera meccanica vi dirà che non si torna indietro. Chi lavora
accanto a lui, qualche volta, la pensa diversamente. Proviamo con quattro domande.

## Dove la usate?

In una stanza vostra, fate quello che volete. In un ufficio aperto o in aula, il
suono diventa un problema di educazione prima che di gusto. Esistono interruttori
silenziosi, e cambiano davvero le cose: se la tastiera è "hot swap" li potete
sostituire senza saldare niente.

## Quanto scrivete, e cosa

Per scrivere codice tutto il giorno la corsa breve di una tastiera a profilo
basso stanca meno. Per scrivere testi lunghi la corsa piena di una meccanica dà
un ritorno più netto e si sbaglia meno. Non è una questione di velocità massima:
è una questione di quanta forza ripetete diecimila volte al giorno.

## Il layout italiano esiste?

Sì, ma non su tutti i modelli, e sulle tastiere meccaniche è la vera trappola.
Verificate sempre che ci sia la variante ITA: trovarsi senza la lettera accentata
al posto giusto, o con la barra rovesciata in un angolo diverso, è un fastidio
quotidiano.

## Fili o batteria?

Il cavo non si scarica mai e non ha latenza di cui discutere. Il senza fili
libera la scrivania e oggi dura settimane. Se passate da un portatile a un fisso
più volte al giorno, una tastiera che tiene tre dispositivi in memoria e cambia
con un tasto vale il sovrapprezzo.

## In pratica

Una **K8 Pro** per chi vuole provare la meccanica senza spendere troppo e con la
libertà di cambiare gli interruttori. Una **MX Keys S** per chi scrive molto, in
compagnia, e vuole dimenticarsi che la tastiera esista.
`,
  'blog/src/content/blog/monitor-180hz-serve-davvero.md': `---
title: "Un monitor a 180 Hz serve davvero?"
description: "Dipende da cosa ci fate: nei giochi la differenza si vede subito, al lavoro si nota in un punto solo. Proviamo a essere precisi."
pubDate: 2026-10-13
tags: ["monitor", "gaming"]
prodotti: [9, 3]
---

Un monitor a 60 Hz mostra sessanta immagini al secondo. Uno a 180 Hz ne mostra
tre volte tante. La domanda non è se la differenza esista: è se la vedete voi,
con quello che fate voi.

## Nei giochi d'azione: sì, e non è una questione di occhio allenato

Fra un fotogramma e l'altro a 60 Hz passano quasi 17 millisecondi; a 180 Hz meno
di 6. Nei giochi in cui si mira muovendo tutta la visuale, il bersaglio si sposta
di meno tra un'immagine e l'altra, e correggere diventa più facile. È il motivo
per cui chi passa a un monitor veloce raramente torna indietro.

Attenzione però al collo di bottiglia: 180 Hz servono se il computer produce
180 fotogrammi al secondo. Con una scheda di fascia media a risoluzione QHD ci
siete in molti titoli, ma non in tutti.

## Al lavoro: si nota in un punto solo

Scrivere codice a 60 o a 180 Hz è identico. Quello che cambia è il movimento
continuo: lo scorrimento di una pagina lunga e il puntatore del mouse diventano
fluidi invece di saltare. È piacevole, non è produttività. Se dovete scegliere
dove mettere i soldi al lavoro, metteteli nella risoluzione e nella diagonale,
non nella frequenza.

## I numeri da guardare prima della frequenza

- **Risoluzione per pollice**: un 27 pollici in Full HD mostra i pixel. QHD è il
  minimo per quella diagonale.
- **Pannello**: IPS per i colori e gli angoli di visione, e oggi la differenza di
  velocità con i pannelli da gioco di una volta è quasi scomparsa.
- **Regolazione in altezza**: un monitor che non si alza è un monitor sbagliato,
  a qualsiasi frequenza.
- **USB-C con ricarica**: se usate un portatile, è la voce che vi cambia la
  giornata più di 120 Hz in più.

## In pratica

Un **UltraGear 27 QHD a 180 Hz** se giocate e il computer regge. Un **desktop con
RTX 5070** se il collo di bottiglia è la scheda e non lo schermo: i 180 Hz senza
fotogrammi da mostrare restano un numero sulla scatola.
`,
  'blog/src/content/blog/backup-che-si-fa-davvero.md': `---
title: "Il backup che si fa davvero, in dieci minuti"
description: "La regola 3-2-1 spiegata senza fronzoli e una procedura che potete mettere in piedi stasera, con un disco esterno e nient'altro."
pubDate: 2026-10-20
tags: ["guide", "accessori"]
prodotti: [15, 16]
---

Il backup migliore non è il più sofisticato: è quello che fate davvero. Tutti i
sistemi complicati finiscono allo stesso modo, cioè abbandonati dopo due
settimane.

## La regola 3-2-1, in una riga

Tre copie dei dati, su due supporti diversi, di cui una in un altro posto. Il
"posto diverso" non è pedanteria: un furto, un incendio o un allagamento si
portano via il computer e il disco che gli sta accanto.

## Cosa salvare (meno di quanto pensate)

Il sistema operativo si reinstalla in mezz'ora e i programmi si riscaricano. Le
cose irripetibili sono poche: i vostri progetti, le foto, i documenti, le chiavi
SSH e i file di configurazione. Fate l'elenco una volta: scoprirete che sta in
molto meno spazio del disco che avete.

Il codice merita una nota: se è su Git e l'avete spinto su un server remoto, una
copia è già altrove. Attenzione a quello che Git non segue, come i file di
ambiente e i database locali.

## La procedura, stasera

1. Collegate un SSD esterno e chiamatelo in modo riconoscibile.
2. Attivate lo strumento già incluso nel sistema: Cronologia file su Windows,
   Time Machine su macOS. Non serve altro software.
3. Impostate l'esecuzione automatica e **staccate il disco** quando ha finito.
   Un disco sempre collegato viene cifrato dal ransomware insieme al computer.
4. Per la copia fuori sede, scegliete: un servizio cloud per le cartelle
   importanti, oppure un secondo disco che tenete da un'altra parte.

## Il passo che quasi nessuno fa

Provate a ripristinare un file. Uno qualsiasi. Un backup che non è mai stato
riletto non è un backup: è una speranza. Dieci minuti adesso, invece di una brutta
scoperta il giorno sbagliato.

## In pratica

Un **SSD esterno da 2 TB** è abbastanza veloce da non farvi odiare l'operazione, e
un **hub USB-C** serve il giorno in cui il portatile ha una porta sola e vi
accorgete che è occupata dal caricabatterie.
`,
  'blog/src/content/blog/perche-il-blog-non-e-una-spa.md': `---
title: "Perché questo blog non è fatto come il negozio"
description: "Il catalogo è un'applicazione React, questi articoli sono file HTML generati una volta. Due mestieri diversi, due strumenti diversi."
pubDate: 2026-10-24
author: "Il corso di Frontend Development"
tags: ["dietro-le-quinte"]
prodotti: []
---

Se aprite il negozio e questo blog uno dopo l'altro, sembrano lo stesso sito.
Dentro non lo sono affatto, e la differenza è una scelta, non una dimenticanza.

## Il negozio deve far fare, il blog deve far leggere

Nel catalogo si cerca, si filtra, si accede, si riempie un carrello. Sono azioni:
cambiano a ogni clic e dipendono da chi siete. Per questo il negozio è
un'applicazione React che si carica una volta e poi parla con un'API: tutto
accade nel vostro browser, senza ricaricare la pagina.

Questo articolo, invece, è lo stesso per tutti e cambia solo quando lo
riscriviamo. Non c'è niente da calcolare quando lo aprite. Quindi non lo
calcoliamo: lo generiamo una volta, al momento della pubblicazione, e quello che
arriva al vostro browser è un file HTML già scritto.

## Cosa cambia per chi legge

Il peso. Questa pagina arriva praticamente senza JavaScript: il browser scarica
dell'HTML, lo disegna e ha finito. Non deve eseguire un'applicazione per
mostrarvi del testo. Su una connessione lenta o su un telefono vecchio la
differenza non è una sensazione, sono secondi.

E la trovabilità. Un motore di ricerca legge questa pagina e trova il titolo, il
testo, le date e i link, perché ci sono già. In un'applicazione che costruisce
tutto in JavaScript, al primo passaggio, spesso non trova niente.

## Il punto in cui le due cose si toccano

C'è un dettaglio che tradisce la differenza: i prezzi. Quando un articolo di
questo blog cita un prodotto, il prezzo viene letto **al momento della
generazione della pagina**. Se domani lo cambiamo nel catalogo, qui resta quello
vecchio finché il blog non viene rigenerato.

Si può sistemare, e l'abbiamo fatto: accanto al prezzo "congelato" c'è un piccolo
pezzo di pagina, e solo quello, che al momento della visita chiede all'API il
prezzo aggiornato. Un'isola di interattività in un mare di HTML statico. Il resto
della pagina non ne sa niente e non paga niente.

## La morale, per chi studia queste cose

Non esiste lo strumento giusto: esiste lo strumento giusto per quel pezzo. La
stessa azienda, lo stesso catalogo, gli stessi dati, e tre tecnologie diverse
nello stesso repository, ognuna dove rende meglio.
`,
  'blog/src/styles/global.css': `/*
 * Gli stessi colori del negozio e della vetrina: un progetto, un'identita'.
 * Il tema scuro e' solo prefers-color-scheme, quindi non costa un byte di
 * JavaScript. In un sito di contenuti e' esattamente cio' che serve.
 */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.371 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --border: oklch(1 0 0 / 12%);
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
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}

/*
 * La tipografia del Markdown, scritta a mano.
 *
 * Esiste il plugin @tailwindcss/typography e in un progetto vero si usa. Qui no,
 * di proposito: sono trenta righe di CSS, e vedere quali sono gli elementi che il
 * Markdown produce davvero vale piu' di una dipendenza in piu'.
 */
@layer components {
  .prosa {
    max-width: 68ch;
    line-height: 1.75;
  }
  .prosa > * + * {
    margin-top: 1.1em;
  }
  .prosa h2 {
    margin-top: 2.2em;
    font-size: 1.4rem;
    font-weight: 650;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .prosa h3 {
    margin-top: 1.8em;
    font-size: 1.15rem;
    font-weight: 600;
  }
  .prosa strong {
    font-weight: 650;
    color: var(--foreground);
  }
  .prosa a {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .prosa ul,
  .prosa ol {
    padding-left: 1.4em;
  }
  .prosa ul {
    list-style: disc;
  }
  .prosa ol {
    list-style: decimal;
  }
  .prosa li + li {
    margin-top: 0.4em;
  }
  .prosa blockquote {
    border-left: 3px solid var(--border);
    padding-left: 1em;
    font-style: italic;
    color: var(--muted-foreground);
  }
  .prosa code {
    background-color: var(--muted);
    border-radius: 0.3rem;
    padding: 0.15em 0.35em;
    font-size: 0.9em;
  }
  .prosa pre {
    background-color: var(--muted);
    border-radius: var(--radius);
    padding: 1em;
    overflow-x: auto;
  }
  .prosa pre code {
    background: none;
    padding: 0;
  }
}
`,
  'blog/src/lib/shop.ts': `/**
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

const API_URL = (import.meta.env.API_URL ?? 'http://localhost:3001/api').replace(/\\/+$/, '')

/** Dove gira la SPA: i link "vai alla scheda" portano la'. */
export const APP_URL = (import.meta.env.PUBLIC_APP_URL ?? 'http://localhost:5173').replace(
  /\\/+$/,
  '',
)

/**
 * Il catalogo si scarica una volta sola per tutta la build, non una volta per post:
 * sei post che citano due articoli ciascuno farebbero dodici chiamate identiche.
 * La promessa viene tenuta da parte e riusata (e' la cache piu' semplice che esista).
 */
let catalogo: Promise<Map<number, Product>> | null = null

async function caricaCatalogo(): Promise<Map<number, Product>> {
  const indirizzo = \`\${API_URL}/products\`
  try {
    const risposta = await fetch(indirizzo)
    if (!risposta.ok) throw new Error(\`\${risposta.status} \${risposta.statusText}\`)
    const prodotti = (await risposta.json()) as Product[]
    console.log(\`[blog] catalogo letto da \${indirizzo}: \${prodotti.length} articoli\`)
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
      \`[blog] non riesco a leggere \${indirizzo} (\${(errore as Error).message}).\\n\` +
        '        Le schede prodotto nei post resteranno senza prezzo.\\n' +
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
`,
  'blog/src/layouts/BaseLayout.astro': `---
import '../styles/global.css'
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'

/*
 * Il guscio di ogni pagina.
 *
 * In un componente .astro quello che sta fra i tre trattini gira SOLO in fase di
 * build: qui si leggono dati, si calcolano indirizzi, si decide cosa stampare.
 * Quello che sta sotto e' il modello, e diventa HTML. Non esiste un equivalente di
 * useState: se serve stato, serve un'isola (vedi PrezzoLive.tsx).
 */
interface Props {
  title: string
  description: string
  /** Presente solo nelle pagine dei post: cambia i metadati e i dati strutturati. */
  articolo?: { pubblicato: Date; autore: string; tag: string[] }
  /** La home non vuole il suffisso nel titolo. */
  titoloEsatto?: boolean
}

const { title, description, articolo, titoloEsatto = false } = Astro.props

const canonico = new URL(Astro.url.pathname, Astro.site)
const titolo = titoloEsatto ? title : \`\${title} | Blog minicommerce\`

const datiStrutturati = articolo
  ? {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      datePublished: articolo.pubblicato.toISOString(),
      author: { '@type': 'Organization', name: articolo.autore },
      keywords: articolo.tag.join(', '),
      inLanguage: 'it-IT',
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonico.href },
    }
  : {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Il blog di minicommerce',
      description,
      url: new URL('/', Astro.site).href,
      inLanguage: 'it-IT',
    }
---

<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{titolo}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonico.href} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="generator" content={Astro.generator} />

    <!-- Il feed RSS non e' nostalgia: e' il modo in cui un blog si fa seguire
         senza algoritmi in mezzo, ed e' tre righe di codice (vedi pages/rss.xml.ts). -->
    <link
      rel="alternate"
      type="application/rss+xml"
      title="Il blog di minicommerce"
      href={new URL('rss.xml', Astro.site).href}
    />

    <meta property="og:type" content={articolo ? 'article' : 'website'} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonico.href} />
    <meta property="og:locale" content="it_IT" />
    <meta property="og:site_name" content="Blog minicommerce" />
    <meta name="twitter:card" content="summary_large_image" />
    {
      articolo && (
        <meta property="article:published_time" content={articolo.pubblicato.toISOString()} />
      )
    }

    <script
      type="application/ld+json"
      is:inline
      set:html={JSON.stringify(datiStrutturati).replace(/</g, '\\\\u003c')}
    />
  </head>
  <body class="flex min-h-dvh flex-col">
    <a
      href="#contenuto"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Salta al contenuto
    </a>
    <Header />
    <main id="contenuto" class="flex-1">
      <slot />
    </main>
    <Footer />
  </body>
</html>
`,
  'blog/src/components/Header.astro': `---
import { APP_URL } from '../lib/shop'

/*
 * L'intestazione: HTML e nient'altro.
 *
 * Nel negozio l'equivalente e' un componente React che conosce l'utente, conta gli
 * articoli nel carrello e si aggiorna da solo. Qui non serve niente di tutto questo:
 * un blog e' uguale per tutti, e il link al negozio e' un <a> che porta altrove.
 */
const percorso = Astro.url.pathname
const attiva = (inizio: string) =>
  inizio === '/' ? percorso === '/' : percorso.startsWith(inizio)
---

<header class="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
  <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
    <a href="/" class="text-lg font-semibold">
      minicommerce <span class="text-muted-foreground">/ blog</span>
    </a>
    <nav aria-label="Navigazione del blog" class="flex items-center gap-1 text-sm">
      <a
        href="/"
        class:list={['rounded-md px-3 py-2 hover:bg-accent', { 'font-medium': attiva('/') }]}
        aria-current={attiva('/') ? 'page' : undefined}
      >
        Articoli
      </a>
      <a
        href="/tag/guide"
        class:list={['rounded-md px-3 py-2 hover:bg-accent', { 'font-medium': attiva('/tag') }]}
      >
        Guide
      </a>
      <a
        class="ml-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
        href={APP_URL}
      >
        Vai al negozio
      </a>
    </nav>
  </div>
</header>
`,
  'blog/src/components/Footer.astro': `---
import { getCollection } from 'astro:content'
import { APP_URL } from '../lib/shop'

/*
 * I tag del pie' di pagina non sono scritti a mano: si leggono dai post, al momento
 * della build. Aggiungere un tag a un articolo lo fa comparire qui, in automatico,
 * su tutte le pagine.
 */
const post = await getCollection('blog', ({ data }) => !data.bozza)
const tag = [...new Set(post.flatMap((articolo) => articolo.data.tags))].sort()
const anno = new Date().getFullYear()
---

<footer class="mt-16 border-t bg-card">
  <div class="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
    <div class="space-y-2">
      <p class="font-semibold">Il blog di minicommerce</p>
      <p class="text-sm text-muted-foreground">
        Guide all'acquisto e appunti di bottega. Pagine generate una volta, servite
        come file: per leggere del testo non serve eseguire un'applicazione.
      </p>
    </div>
    <nav aria-label="Argomenti" class="space-y-2">
      <p class="font-semibold">Argomenti</p>
      <ul class="space-y-1 text-sm text-muted-foreground">
        {
          tag.map((nome) => (
            <li>
              <a class="hover:text-foreground hover:underline" href={\`/tag/\${nome}\`}>#{nome}</a>
            </li>
          ))
        }
      </ul>
    </nav>
    <nav aria-label="Collegamenti" class="space-y-2">
      <p class="font-semibold">Collegamenti</p>
      <ul class="space-y-1 text-sm text-muted-foreground">
        <li><a class="hover:text-foreground hover:underline" href={APP_URL}>Il negozio</a></li>
        <li><a class="hover:text-foreground hover:underline" href="/rss.xml">Feed RSS</a></li>
        <li>
          <a class="hover:text-foreground hover:underline" href="/sitemap-index.xml">sitemap</a>
        </li>
      </ul>
    </nav>
  </div>
  <div class="border-t py-4 text-center text-xs text-muted-foreground">
    {anno} minicommerce - progetto del corso di Frontend Development, ITS
  </div>
</footer>
`,
  'blog/src/components/PostCard.astro': `---
import type { CollectionEntry } from 'astro:content'
import { formatDate } from '../lib/shop'

interface Props {
  post: CollectionEntry<'blog'>
}

const { post } = Astro.props
---

<article class="group border-b py-6 first:pt-0">
  <p class="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <time datetime={post.data.pubDate.toISOString()}>{formatDate(post.data.pubDate)}</time>
    {post.data.tags.map((tag) => <span>#{tag}</span>)}
  </p>
  <h2 class="text-xl font-semibold leading-snug">
    <a class="group-hover:underline" href={\`/blog/\${post.id}/\`}>{post.data.title}</a>
  </h2>
  <p class="mt-2 text-muted-foreground">{post.data.description}</p>
  <a
    class="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
    href={\`/blog/\${post.id}/\`}
  >
    Leggi l'articolo
  </a>
</article>
`,
  'blog/src/components/ProductCard.astro': `---
import PrezzoLive from './PrezzoLive'
import { APP_URL, type Product } from '../lib/shop'

/*
 * La scheda di un articolo del catalogo, dentro un post.
 *
 * Nome, marca, categoria e disponibilita' sono scritti nell'HTML al momento della
 * build: sono dati che cambiano raramente e che devono esserci anche per chi legge
 * senza JavaScript. Il prezzo no: quello e' l'unica cosa che vale la pena chiedere
 * al negozio nel momento della visita, e lo fa l'isola PrezzoLive.
 */
interface Props {
  prodotto: Product
}

const { prodotto } = Astro.props
---

<article class="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
  <div class="space-y-1">
    <p class="text-xs uppercase tracking-wide text-muted-foreground">
      {prodotto.category}{prodotto.brand ? \` - \${prodotto.brand}\` : ''}
    </p>
    <h3 class="font-semibold leading-snug">{prodotto.name}</h3>
    <p class="text-xs text-muted-foreground">
      {prodotto.stock > 0 ? \`\${prodotto.stock} pezzi disponibili alla pubblicazione\` : 'Esaurito'}
    </p>
  </div>

  <div class="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
    <PrezzoLive productId={prodotto.id} prezzoAlBuild={prodotto.price} client:visible />
    <a
      class="inline-flex h-9 shrink-0 items-center rounded-md border px-3 text-sm hover:bg-accent"
      href={\`\${APP_URL}/article/\${prodotto.id}\`}
    >
      Vai alla scheda
    </a>
  </div>
</article>
`,
  'blog/src/components/PrezzoLive.tsx': `import { useEffect, useState } from 'react'

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

const API_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\\/+$/, '')

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

    fetch(\`\${API_URL}/products/\${productId}\`, { signal: controllo.signal })
      .then((risposta) => {
        if (!risposta.ok) throw new Error(\`HTTP \${risposta.status}\`)
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
`,
  'blog/src/pages/index.astro': `---
import { getCollection } from 'astro:content'
import BaseLayout from '../layouts/BaseLayout.astro'
import PostCard from '../components/PostCard.astro'

/*
 * L'elenco degli articoli.
 *
 * getCollection legge i file Markdown al momento della build e restituisce dati
 * tipizzati: post.data.pubDate e' una Date vera, non una stringa da interpretare.
 * Nessuna chiamata di rete, nessun database: i contenuti sono file nel repository,
 * e si rivedono in una pull request come si rivede il codice.
 */
const post = (await getCollection('blog', ({ data }) => !data.bozza)).sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
)

const descrizione =
  "Guide all'acquisto, confronti e appunti di bottega sul mondo dei computer: " +
  'quello che serve sapere prima di scegliere.'
---

<BaseLayout title="Il blog di minicommerce" description={descrizione} titoloEsatto>
  <div class="mx-auto max-w-5xl px-4 py-12">
    <header class="space-y-3 border-b pb-8">
      <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
        Prima di comprare, due parole sul perche&apos;
      </h1>
      <p class="max-w-2xl text-muted-foreground">{descrizione}</p>
      <p class="text-sm text-muted-foreground">
        {post.length} articoli - <a class="underline" href="/rss.xml">feed RSS</a>
      </p>
    </header>

    <div class="mt-8">
      {post.map((articolo) => <PostCard post={articolo} />)}
    </div>
  </div>
</BaseLayout>
`,
  'blog/src/pages/blog/[...slug].astro': `---
import { getCollection, render } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'
import ProductCard from '../../components/ProductCard.astro'
import { formatDate, getProducts } from '../../lib/shop'

/*
 * UNA PAGINA PER OGNI POST, decisa in fase di build.
 *
 * getStaticPaths e' il cuore di un generatore di siti statici: dice "ecco l'elenco
 * delle pagine che devono esistere". Astro le costruisce tutte, una per una, e il
 * risultato e' una cartella di file .html. Non c'e' nessun server che renderizza
 * niente quando arriva un lettore.
 */
export async function getStaticPaths() {
  const post = await getCollection('blog', ({ data }) => !data.bozza)
  return post.map((articolo) => ({
    params: { slug: articolo.id },
    props: { articolo },
  }))
}

const { articolo } = Astro.props

// render() trasforma il Markdown in un componente: il lavoro avviene adesso, in
// fase di build, non nel browser del lettore.
const { Content } = await render(articolo)

// I prodotti citati nel frontmatter, letti dall'API del negozio durante la build.
const prodotti = await getProducts(articolo.data.prodotti)
---

<BaseLayout
  title={articolo.data.title}
  description={articolo.data.description}
  articolo={{
    pubblicato: articolo.data.pubDate,
    autore: articolo.data.author,
    tag: articolo.data.tags,
  }}
>
  <article class="mx-auto max-w-5xl px-4 py-12">
    <header class="space-y-4 border-b pb-8">
      <p class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <time datetime={articolo.data.pubDate.toISOString()}>
          {formatDate(articolo.data.pubDate)}
        </time>
        <span>-</span>
        <span>{articolo.data.author}</span>
      </p>
      <h1 class="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        {articolo.data.title}
      </h1>
      <p class="max-w-2xl text-lg text-muted-foreground">{articolo.data.description}</p>
      <ul class="flex flex-wrap gap-2">
        {
          articolo.data.tags.map((tag) => (
            <li>
              <a class="rounded-full border px-3 py-1 text-xs hover:bg-accent" href={\`/tag/\${tag}\`}>
                #{tag}
              </a>
            </li>
          ))
        }
      </ul>
    </header>

    <div class="prosa mt-8">
      <Content />
    </div>

    {
      prodotti.length > 0 && (
        <section class="mt-12 space-y-4 border-t pt-8" aria-labelledby="citati">
          <h2 id="citati" class="text-xl font-semibold">Gli articoli di cui si parla</h2>
          <p class="text-sm text-muted-foreground">
            Nome e disponibilita&apos; sono quelli del giorno di pubblicazione; il prezzo lo
            chiediamo al negozio mentre leggete.
          </p>
          {prodotti.map((prodotto) => <ProductCard prodotto={prodotto} />)}
        </section>
      )
    }

    <nav class="mt-12 border-t pt-6">
      <a class="text-sm underline underline-offset-4" href="/">Torna a tutti gli articoli</a>
    </nav>
  </article>
</BaseLayout>
`,
  'blog/src/pages/tag/[tag].astro': `---
import { getCollection } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'
import PostCard from '../../components/PostCard.astro'

/*
 * Una pagina per ogni tag, e anche questo elenco si calcola dai contenuti: nessuno
 * deve ricordarsi di aggiungere una pagina quando nasce un argomento nuovo.
 */
export async function getStaticPaths() {
  const post = await getCollection('blog', ({ data }) => !data.bozza)
  const tag = [...new Set(post.flatMap((articolo) => articolo.data.tags))]

  return tag.map((nome) => ({
    params: { tag: nome },
    props: {
      nome,
      post: post
        .filter((articolo) => articolo.data.tags.includes(nome))
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()),
    },
  }))
}

const { nome, post } = Astro.props
---

<BaseLayout
  title={\`Articoli su \${nome}\`}
  description={\`Tutti gli articoli del blog di minicommerce con il tag \${nome}: \${post.length} in archivio, dal piu' recente al piu' vecchio.\`}
>
  <div class="mx-auto max-w-5xl px-4 py-12">
    <header class="space-y-2 border-b pb-8">
      <p class="text-sm text-muted-foreground">Argomento</p>
      <h1 class="text-3xl font-bold tracking-tight">#{nome}</h1>
      <p class="text-muted-foreground">
        {post.length} {post.length === 1 ? 'articolo' : 'articoli'}
      </p>
    </header>
    <div class="mt-8">
      {post.map((articolo) => <PostCard post={articolo} />)}
    </div>
  </div>
</BaseLayout>
`,
  'blog/src/pages/rss.xml.ts': `import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'

/*
 * IL FEED RSS, in quindici righe.
 *
 * Un file dentro src/pages che non finisce in .astro diventa una rotta che
 * restituisce quello che vuole: qui XML. Il feed nasce dagli stessi dati delle
 * pagine, quindi non puo' andare fuori sincrono con il blog.
 */
export async function GET(context: APIContext) {
  const post = (await getCollection('blog', ({ data }) => !data.bozza)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  )

  return rss({
    title: 'Il blog di minicommerce',
    description: "Guide all'acquisto, confronti e appunti di bottega sul mondo dei computer.",
    // context.site e' il valore di "site" in astro.config.mjs: senza quello non si
    // possono scrivere indirizzi assoluti, e un feed con link relativi non serve.
    site: context.site!,
    items: post.map((articolo) => ({
      title: articolo.data.title,
      description: articolo.data.description,
      pubDate: articolo.data.pubDate,
      link: \`/blog/\${articolo.id}/\`,
      categories: articolo.data.tags,
      author: articolo.data.author,
    })),
    customData: '<language>it-it</language>',
  })
}
`,
  'blog/src/pages/robots.txt.ts': `import type { APIContext } from 'astro'

/*
 * robots.txt generato da codice, per non scrivere a mano un indirizzo assoluto che
 * cambia fra sviluppo e produzione: "site" lo conosce astro.config.mjs, e di qui
 * passa dentro il file.
 *
 * Un file dentro src/pages che non finisce in .astro e' una rotta: puo' restituire
 * XML (rss.xml.ts), testo (questo), JSON, qualsiasi cosa.
 */
export function GET({ site }: APIContext) {
  const righe = [
    'User-agent: *',
    'Allow: /',
    '',
    \`Sitemap: \${new URL('sitemap-index.xml', site)}\`,
    '',
  ]

  return new Response(righe.join('\\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
`,
  'blog/src/pages/404.astro': `---
import BaseLayout from '../layouts/BaseLayout.astro'

/*
 * Astro costruisce questa pagina come 404.html dentro dist/. Quasi tutti gli
 * hosting statici la servono da soli quando un indirizzo non corrisponde a nessun
 * file, con il vero stato 404: una riga di configurazione in meno da scrivere.
 */
---

<BaseLayout
  title="Pagina non trovata"
  description="L'indirizzo richiesto non corrisponde a nessun articolo del blog di minicommerce."
>
  <div class="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
    <p class="font-mono text-sm text-muted-foreground">Errore 404</p>
    <h1 class="text-3xl font-bold tracking-tight">Questo articolo non esiste</h1>
    <p class="text-muted-foreground">
      Forse e&apos; stato spostato, o forse l&apos;indirizzo ha un errore di battitura.
    </p>
    <a
      class="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      href="/"
    >
      Vai a tutti gli articoli
    </a>
  </div>
</BaseLayout>
`,
  'blog/public/favicon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="minicommerce">
  <rect width="64" height="64" rx="14" fill="#171717" />
  <path
    d="M14 44V22l9 12 9-12v22"
    fill="none"
    stroke="#fafafa"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="45" cy="40" r="4.5" fill="#fafafa" />
</svg>
`,
}

// --------------------------------------------------------------------------- //
// 1. Controlli preliminari                                                    //
// --------------------------------------------------------------------------- //

titolo('Controlli preliminari')

for (const atteso of [
  'frontend/package.json',
  'frontend/src/components/Header.tsx',
  'backend/package.json',
]) {
  if (!fs.existsSync(assoluto(atteso))) {
    errore(`non trovo ${atteso}: esegui lo script dalla radice del repository minicommerce.`)
  }
}
const maggiore = Number(process.versions.node.split('.')[0])
if (maggiore < 22) errore(`Astro 7 vuole Node 22 o superiore (trovato ${process.versions.node}).`)
info(`repository: ${RADICE}`)
info(`Node ${process.versions.node}`)
if (FORZA) info('--forza: i file generati verranno riscritti')

// --------------------------------------------------------------------------- //
// 2. Il guscio, dalla CLI ufficiale                                           //
// --------------------------------------------------------------------------- //

titolo('Il guscio Astro in blog/')

const giaGenerato = fs.existsSync(assoluto('blog/package.json'))

if (giaGenerato) {
  info("blog/package.json c'e' gia': salto create astro")
} else {
  // --template minimal: partiamo da una pagina vuota, cosi' si vede nascere ogni
  // pezzo. Gli altri template arrivano con un blog gia' fatto, che a lezione
  // sarebbe come leggere la soluzione prima dell'esercizio.
  esegui(
    NPM,
    [
      'create',
      'astro@latest',
      'blog',
      '--',
      '--template',
      'minimal',
      SALTA_INSTALL ? '--no-install' : '--install',
      '--no-git',
      '--no-ai',
      '--yes',
      '--skip-houston',
    ],
    RADICE,
  )
}

// --------------------------------------------------------------------------- //
// 3. Le integrazioni                                                          //
// --------------------------------------------------------------------------- //

titolo('Le integrazioni: React, sitemap, Tailwind')

if (SALTA_INSTALL) {
  info('--salta-install: salto astro add e npm install')
} else if (fs.existsSync(assoluto('blog/node_modules/@astrojs/react'))) {
  info("le integrazioni ci sono gia': salto astro add")
} else {
  // "astro add" fa tre cose in un colpo: installa i pacchetti, li aggiunge alle
  // integrazioni in astro.config.mjs e sistema il tsconfig. Il file di
  // configurazione lo riscriviamo noi al passo 4, ma il comando e' questo.
  esegui(NPX, ['astro', 'add', 'react', 'sitemap', 'tailwind', '--yes'], assoluto('blog'))
  // Il feed RSS non ha un'integrazione: e' un pacchetto normale.
  esegui(NPM, ['install', '@astrojs/rss'], assoluto('blog'))
}

// --------------------------------------------------------------------------- //
// 4. I file del blog                                                          //
// --------------------------------------------------------------------------- //

titolo('I file del blog')

/*
 * I file del generatore che riscriviamo sparisicono prima: crea() non sovrascrive
 * mai niente, ed e' giusto cosi' (nessuno vuole perdere il proprio lavoro perche'
 * ha rilanciato uno script). Quelli elencati qui sotto non sono lavoro di nessuno:
 * sono il progetto di esempio di Astro e il global.css che "astro add tailwind"
 * crea con una riga dentro.
 */
if (!giaGenerato) {
  for (const file of [
    'blog/src/pages/index.astro',
    'blog/src/styles/global.css',
    'blog/astro.config.mjs',
    'blog/README.md',
    'blog/public/favicon.svg',
    'blog/public/favicon.ico',
  ]) {
    const percorso = assoluto(file)
    if (fs.existsSync(percorso)) {
      fs.rmSync(percorso)
      info(`- ${file}`)
    }
  }
}

for (const [relativo, contenuto] of Object.entries(SORGENTI)) {
  crea(relativo, contenuto)
}

// --------------------------------------------------------------------------- //
// 5. Ambiente e collegamento dal negozio                                      //
// --------------------------------------------------------------------------- //

titolo("Variabili d'ambiente e link dal negozio al blog")

if (!fs.existsSync(assoluto('blog/.env'))) {
  fs.copyFileSync(assoluto('blog/.env.example'), assoluto('blog/.env'))
  info('+ blog/.env (copia di .env.example, non va nel repository)')
} else {
  info("= blog/.env esiste gia'")
}

/*
 * L'unica modifica al negozio: una voce "Blog" nell'intestazione.
 *
 * E' un <a> e non un <Link> del router, perche' il blog e' un altro sito: un altro
 * indirizzo, un altro bundle, un'altra build. Un <Link> cercherebbe /blog fra le
 * rotte dell'applicazione e troverebbe il vuoto.
 */
patch(
  'frontend/src/components/Header.tsx',
  `          <Button asChild variant="ghost" size="sm">
            <Link to="/about">About</Link>
          </Button>`,
  `          <Button asChild variant="ghost" size="sm">
            <Link to="/about">About</Link>
          </Button>
          {/* Il blog e' un altro sito, non una rotta di questa applicazione: serve
              un <a> vero, perche' <Link> cercherebbe la pagina dentro il router.
              VITE_BLOG_URL permette di spostarlo senza toccare il codice. */}
          <Button asChild variant="ghost" size="sm">
            <a href={import.meta.env.VITE_BLOG_URL ?? 'http://localhost:4321'}>Blog</a>
          </Button>`,
  'voce "Blog" nella barra di navigazione',
)

// --------------------------------------------------------------------------- //
// 6. Build                                                                    //
// --------------------------------------------------------------------------- //

titolo('Build del blog')

if (SALTA_BUILD || SALTA_INSTALL) {
  info('salto npm run build')
} else {
  esegui(NPM, ['run', 'build'], assoluto('blog'))
}

// --------------------------------------------------------------------------- //
// Riepilogo                                                                   //
// --------------------------------------------------------------------------- //

console.log('\n' + '-'.repeat(78))
console.log(`File creati: ${creati.length}    file modificati: ${modificati.length}`)
console.log('-'.repeat(78))
console.log(`
minicommerce ha un blog. Come si avvia:

  1. cd blog     && npm run dev        il blog su :4321
  2. cd backend  && npm run dev        opzionale: serve solo per i prezzi nei post
  3. cd frontend && npm run dev        il negozio su :5173, con la voce "Blog"

  Le pagine statiche vere, come in produzione:

     cd blog && npm run build          scrive dist/
     cd blog && npm run preview        le serve

  dist/ e' una cartella di file: si pubblica dove si vuole, anche su un hosting
  che non sa cosa sia Node.

Documentazione: docs/WEB-ASTRO.md
`)
