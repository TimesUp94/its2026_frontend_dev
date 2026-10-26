# minicommerce come sito vetrina: Next.js 16

Questo documento accompagna il ramo `web/nextjs`. Spiega cosa e' stato aggiunto,
come si avvia, e - soprattutto - **cosa guardare a lezione**, perche' la differenza
fra una SPA e un sito indicizzabile non si vede dall'aspetto della pagina: si vede
nell'HTML che il server spedisce.

---

## 1. L'idea

minicommerce ha un problema che non si vede: le sue pagine sono vuote.

```bash
curl -s http://localhost:5173/article/1 | Select-String "ThinkPad"
# niente
```

L'articolo c'e', il prezzo c'e', ma arrivano dopo, quando il browser ha scaricato ed
eseguito il JavaScript. Un motore di ricerca al primo passaggio legge solo
`<div id="root"></div>`: 632 byte, una parola di testo, zero link. Non e' un difetto
della SPA, e' il suo modo di funzionare. Ma significa che il catalogo non esiste per
chi non lo conosce gia'.

La vetrina in `web/` risolve questo e solo questo. Mostra gli stessi dati, presi
dalla stessa API, ma li scrive nell'HTML **prima** che il visitatore arrivi:

```bash
curl -s http://localhost:3000/prodotti/1-thinkpad-x1-carbon-gen-12 | Select-String "ThinkPad"
# <title>ThinkPad X1 Carbon Gen 12 | minicommerce</title> ... e altre 6 volte
```

Quello che la vetrina **non** fa: login, carrello, area di amministrazione. Quelle
sono funzioni da applicazione e restano nella SPA. Le due cose convivono e si
passano la mano con un link.

---

## 2. Prerequisiti

- **Node 22 o superiore** (`node --version`) e npm.
- **Il backend avviato**: `cd backend && npm run dev`. Non e' un dettaglio: le pagine
  statiche vengono generate durante `npm run build`, quindi l'API deve rispondere
  **in fase di compilazione**, non solo quando un utente visita il sito.
- Connessione a internet la prima volta (`npx create-next-app`, `npm install`).

## 3. Setup con un comando

Da un clone pulito del ramo `master`, dalla radice del repository:

```bash
node scripts/setup-nextjs.mjs
```

Lo script esegue, stampandoli uno per uno, tutti i comandi spiegati a lezione:
`npx create-next-app@latest web ...`, `npm install`, `npm run build`. E' idempotente:
se lo rilanciate non ricrea quello che c'e' gia' (`--forza` per riscrivere i file
generati, `--salta-install` e `--salta-build` per fermarsi prima).

Il ramo `web/nextjs` contiene **il risultato** dello script: se volete solo vedere il
sito, basta `cd web && npm install`.

## 4. Avvio

Due terminali per lo sviluppo:

```bash
cd backend && npm run dev     # API su http://localhost:3001
cd web     && npm run dev     # sito su http://localhost:3000
```

Per vedere il sito come lo vedra' il mondo (pagine statiche vere, non ricompilate a
ogni richiesta):

```bash
cd web && npm run build && npm start
```

Il terzo terminale, utile per i confronti, e' la SPA di sempre:

```bash
cd frontend && npm run dev    # http://localhost:5173
```

> **Porta 3000 occupata?** `npm run dev -- --port 3100` e, per la build,
> `npx next start -p 3100`. Ricordatevi di aggiornare `NEXT_PUBLIC_SITE_URL`, oppure
> i tag `canonical` continueranno a dichiarare la porta 3000.

---

## 5. La mappa

```
web/
  app/
    layout.tsx                 intestazione, pie' di pagina, metadati comuni, JSON-LD del sito
    globals.css                gli stessi colori della SPA, tema scuro senza JavaScript
    page.tsx                   CATALOGO: dipende dai filtri, quindi dinamico
    not-found.tsx              la pagina 404 (con lo stato 404 vero)
    robots.ts                  genera /robots.txt
    sitemap.ts                 genera /sitemap.xml da tutti gli articoli e le categorie
    chi-siamo/page.tsx         pagina statica pura, nessun dato
    categorie/page.tsx         indice delle categorie
    categorie/[slug]/page.tsx  una pagina per categoria, pregenerata
    prodotti/[slug]/page.tsx   una pagina per articolo, pregenerata: il cuore del progetto
    prodotti/[slug]/opengraph-image.tsx   l'immagine 1200x630 dell'anteprima, una per articolo
    api/revalidate/route.ts    la rotta che butta via la cache quando i dati cambiano
  components/                  Header, Footer, ProductCard, FilterForm, Breadcrumbs, StructuredData
  lib/
    api.ts                     il client dell'API lato server: qui si decide cosa va in cache
    seo.ts                     metadati e dati strutturati (JSON-LD)
    slug.ts                    da "Mouse MX Master 4" a "7-mouse-mx-master-4" e viceversa
    format.ts                  prezzi in euro, date in italiano, descrizioni troncate
scripts/
  setup-nextjs.mjs             la trasformazione completa in un solo file
  confronto-seo.mjs            il confronto SPA / vetrina in una tabella
```

Nessun file di `frontend/` e' stato toccato: la vetrina si aggiunge al progetto, non
lo modifica.

---

## 6. Da fare a lezione, in ordine

### 6.1 La prova del nove (due minuti)

Con backend, SPA e vetrina avviati:

```bash
node scripts/confronto-seo.mjs --spa http://localhost:5173 --vetrina http://localhost:3000
```

```
                 | SPA (Vite)        | Vetrina (Next)
byte di HTML     | 632               | 39111
<title>          | minicommerce      | ThinkPad X1 Carbon Gen 12 | minicommerce
description      | -                 | Ultrabook 14" con Intel Core Ultra 7...
canonical        | -                 | http://localhost:3000/prodotti/1-thinkpad...
<h1>             | -                 | ThinkPad X1 Carbon Gen 12
blocchi JSON-LD  | 0                 | 4
link <a href>    | 0                 | 22
parole di testo  | 1                 | 125
nome articolo    | ASSENTE           | presente
prezzo           | ASSENTE           | presente
```

### 6.2 L'elenco di `next build`

E' il riassunto piu' onesto di cosa fa un framework moderno:

```
Route (app)                                   Revalidate  Expire
┌ ◐ /                                                 1h      1d
├ ○ /categorie                                        1h      1d
├ ○ /chi-siamo                                        1h      1d
├ ○ /robots.txt
├ ○ /sitemap.xml                                      1h      1d
├ ƒ /api/revalidate
├   /prodotti/[slug]                                  1h      1d
│ ├ ○ /prodotti/13-cuffie-wh-1000xm6                  1h      1d
│ └ ◐ [+14 more paths]
└   /prodotti/[slug]/opengraph-image
  └ ● /prodotti/13-cuffie-wh-1000xm6/opengraph-image  1h      1d

○  (Static)             pregenerata
●  (SSG)                pregenerata da generateStaticParams
◐  (Partial Prerender)  guscio statico + parte dinamica in streaming
ƒ  (Dynamic)            calcolata a ogni richiesta
```

Da leggere insieme: 16 articoli, 16 pagine, 16 immagini di anteprima, tutte pronte
prima del primo visitatore. Il catalogo con i filtri no: quello dipende dalla query
string, e infatti e' l'unica pagina che non si puo' pregenerare.

### 6.3 Il titolo, la descrizione, il canonical

```bash
curl -s http://localhost:3000/prodotti/1-thinkpad-x1-carbon-gen-12 | Select-String "<title>|canonical|og:image"
```

Tre tag che Next ha scritto da solo partendo da `generateMetadata()`.

### 6.4 I dati strutturati

Nella stessa pagina ci sono quattro blocchi `application/ld+json`: l'organizzazione,
il sito con la sua ricerca interna, le briciole di pane e il prodotto, con prezzo e
disponibilita'. Sono quelli che permettono a Google di mostrare il prezzo nel
risultato di ricerca. Da incollare nel
[Rich Results Test](https://search.google.com/test/rich-results).

> Regola che vale piu' di tutte le altre: i dati strutturati devono dire la verita'
> su quello che c'e' nella pagina. Niente stelline inventate.

### 6.5 sitemap.xml e robots.txt

```bash
curl -s http://localhost:3000/sitemap.xml | Select-String "<loc>" | Measure-Object -Line
curl -s http://localhost:3000/robots.txt
```

26 indirizzi: tre pagine fisse, sette categorie, sedici articoli. Nessuno li ha
scritti a mano, nascono dai dati.

### 6.6 L'immagine dell'anteprima

Aprite
`http://localhost:3000/prodotti/1-thinkpad-x1-carbon-gen-12/opengraph-image`:
un PNG 1200x630 disegnato da `opengraph-image.tsx` con nome, categoria e prezzo.
E' quello che si vede incollando il link su WhatsApp.

### 6.7 404 e 308 (il dettaglio che distingue un sito fatto bene)

```bash
curl -I http://localhost:3000/prodotti/999-non-esiste      # 404
curl -I http://localhost:3000/prodotti/1-nome-sbagliato     # 308 -> slug giusto
curl -I http://localhost:5173/pagina/che/non/esiste         # 200 (!) nella SPA
```

Una finezza da sapere: alla **primissima** richiesta di un indirizzo mai visto, Next
spedisce subito il guscio statico (stato 200) e completa la pagina in streaming;
dalla seconda richiesta in poi l'esito e' in cache e lo stato e' quello giusto.
Nel frattempo la pagina dichiara `noindex`, quindi nell'indice non ci finisce.
Rilanciate il comando due volte e si vede.

### 6.8 La domanda che arriva sempre: e se cambia un prezzo?

E' la domanda giusta. Risposta in tre comandi.

```bash
# 1. l'amministratore cambia il prezzo (dalla SPA, oppure con l'API)
#    il sito continua a mostrare il prezzo vecchio: la pagina e' in cache
# 2. si butta via la copia in cache
curl -X POST "http://localhost:3000/api/revalidate" `
     -H "x-revalidate-secret: cambiami" `
     -H "content-type: application/json" `
     -d '{"tag":"prodotti"}'
# 3. ricaricate: prezzo nuovo, senza nessuna build e senza nessun deploy
```

Come funziona: ogni funzione di `lib/api.ts` comincia con `'use cache'` ed etichetta
il proprio risultato con `cacheTag('prodotti')`. La rotta `/api/revalidate` chiama
`revalidateTag('prodotti', { expire: 0 })` e la prima visita successiva rigenera
l'HTML. In produzione si usa `'max'` al posto di `{ expire: 0 }`: il visitatore
successivo vede ancora la pagina vecchia e l'aggiornamento avviene di nascosto.

Senza il segreto la rotta risponde 401: quella rotta costa lavoro al server, e un
indirizzo pubblico che costa lavoro e' un invito a farsi male.

**Esercizio naturale** (ed e' la cosa che si fa in produzione): chiamare questa rotta
dal backend dentro `PUT /api/products/:id`, cosi' il sito si aggiorna da solo appena
si salva un articolo.

---

## 7. Le variabili d'ambiente

`web/.env.example` le elenca tutte; `web/.env.local` e' la copia personale e non va
nel repository.

| Variabile | A cosa serve |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | l'indirizzo pubblico del sito: canonical, Open Graph, sitemap |
| `API_URL` | l'API vista dal server di Next (non dal browser) |
| `NEXT_PUBLIC_APP_URL` | dove gira la SPA, per i link a carrello e login |
| `REVALIDATE_SECRET` | il segreto di `POST /api/revalidate` |

`NEXT_PUBLIC_` davanti al nome significa "questa finisce anche nel JavaScript che
scarica il browser": vale per gli indirizzi, non per i segreti.

---

## 8. Le scelte, e perche'

**Niente axios.** `lib/api.ts` usa `fetch`, perche' qui gira Node e perche' Next
intercetta `fetch` per gestire la cache. Non c'e' nessun token da allegare: la
vetrina legge solo rotte pubbliche.

**`cacheComponents: true`.** E' il modello di Next 16, ed e' quello che si ottiene
oggi da `create-next-app`. La regola in una riga: *niente e' in cache se non lo
chiedete voi*. Una funzione che vuole finire in una pagina statica comincia con
`'use cache'`; tutto il resto e' dinamico e, dentro una pagina pregenerata, va messo
dietro un `<Suspense>`.

**I filtri sono un `<form method="get">`.** Nessun JavaScript: il browser costruisce
la query string, il server risponde con l'HTML giusto. Funziona con JavaScript
disattivato e il risultato si puo' copiare come link. Il prezzo da pagare e' che i
campi vuoti finiscono comunque nell'URL, e per i motori di ricerca sono indirizzi
diversi con lo stesso contenuto: per questo la pagina filtrata dichiara `noindex` e
un `canonical` che punta al catalogo pulito.

**L'id davanti allo slug** (`/prodotti/7-mouse-mx-master-4`). Il nome di un articolo
cambia, l'id no: con l'id in testa la pagina si ritrova sempre, e il vecchio
indirizzo viene rediretto al nuovo con un 308.

**Il tema scuro senza `next-themes`.** Solo `prefers-color-scheme`: nessun
JavaScript, nessuna idratazione, nessun lampeggio. In un sito vetrina il tema e' un
dettaglio del CSS.

---

## 9. Problemi noti

| Sintomo | Causa e rimedio |
|---|---|
| `Non riesco a contattare l'API su http://localhost:3001/api...` durante la build | il backend non e' avviato: `cd backend && npm run dev` |
| `EADDRINUSE :3000` | un altro progetto occupa la porta: `npm run dev -- --port 3100` |
| Il `canonical` dice `localhost:3000` in produzione | `NEXT_PUBLIC_SITE_URL` non impostato: va cambiato prima della build |
| Un articolo nuovo non compare nel sito | la cache e' ancora quella di prima: `POST /api/revalidate` |
| `next/image`: `hostname is not configured` | aggiungete l'host a `images.remotePatterns` in `next.config.ts` |
| La prima richiesta a un indirizzo inesistente risponde 200 | e' il guscio statico, vedi 6.7: dalla seconda e' 404 |

## 10. Cosa manca, di proposito

Spazio per gli esercizi:

- **paginazione** del catalogo (ora escono tutti gli articoli in una pagina);
- **ricerca interna** come pagina a se' (`/cerca?q=...`) con il suo `noindex`;
- **immagini vere** degli articoli, per vedere `next/image` lavorare davvero;
- **Lighthouse**: lanciatelo sulla SPA e sulla vetrina e confrontate SEO e LCP;
- **la chiamata a `/api/revalidate` dal backend**, al salvataggio di un articolo;
- **hreflang**, se un giorno il catalogo diventa bilingue.
