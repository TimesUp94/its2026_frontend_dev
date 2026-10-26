# minicommerce e un generatore di siti statici: Astro 7

Questo documento accompagna il ramo `web/astro`. Aggiunge al progetto un **modulo
di contenuti**: un blog scritto in Markdown e trasformato in file HTML una volta
sola, al momento della pubblicazione.

---

## 1. Si puo' usare Astro per minicommerce?

La domanda giusta non e' "si puo'", e' "su che pezzo".

Astro genera pagine **in anticipo**, partendo da file e da chiamate fatte durante la
build. Va a nozze con tutto cio' che cambia quando lo decide chi scrive, e va male
con tutto cio' che cambia da solo o che dipende da chi guarda.

| Pezzo di minicommerce | Astro e' adatto? |
|---|---|
| Guide, recensioni, pagine informative | **Si'**, e' esattamente il suo mestiere |
| Catalogo con filtri e ricerca | No: dipende dalla query string, cambia a ogni richiesta |
| Scheda prodotto con prezzo e disponibilita' | Si', ma andrebbe rigenerata a ogni modifica del catalogo |
| Carrello, login, area admin | No: hanno utente, token e stato |

Per le schede prodotto il confronto e' interessante e la risposta sincera e' "non
lui": Astro sa pregenerarle, ma non ha una risposta pronta alla domanda "e quando
cambia un prezzo?". Next, con `revalidateTag`, butta via una pagina alla volta e la
rigenera (vedi il ramo `web/nextjs`). Con Astro servirebbe una nuova build a ogni
modifica del catalogo.

Per questo nel progetto Astro fa il blog, e lo fa meglio di qualunque alternativa:
sei articoli diventano quindici pagine in un secondo e mezzo, **senza una riga di
JavaScript** nel browser del lettore.

E il filo con il negozio c'e', ed e' la parte piu' istruttiva: ogni post dichiara
nel frontmatter gli id degli articoli di cui parla, il blog li legge dall'API
**durante la build**, e il prezzo che finisce in pagina e' quello del giorno della
pubblicazione. Il difetto e' strutturale, quindi lo mostriamo invece di nasconderlo:
accanto al prezzo congelato c'e' un'**isola** React, e solo quella, che al momento
della visita chiede all'API il prezzo di adesso.

---

## 2. Prerequisiti

- **Node 22 o superiore** e npm.
- Connessione a internet la prima volta (`npm create astro`, `astro add`).
- Il backend **non** e' obbligatorio: senza di lui il blog si costruisce comunque e
  le schede prodotto restano senza prezzo. E' una scelta scritta in
  `blog/src/lib/shop.ts`, opposta a quella della vetrina Next, e per un motivo
  preciso: qui il contenuto sono gli articoli, la' il contenuto E' il prodotto.

## 3. Setup con un comando

Da un clone pulito del ramo `master`, dalla radice del repository:

```bash
node scripts/setup-astro.mjs
```

Esegue, stampandoli uno per uno, i comandi delle slide:
`npm create astro@latest blog -- --template minimal`,
`npx astro add react sitemap tailwind`, `npm install @astrojs/rss`, `npm run build`.
E' idempotente (`--forza`, `--salta-install`, `--salta-build`).

## 4. Avvio

```bash
cd blog     && npm run dev      # il blog su http://localhost:4321
cd frontend && npm run dev      # il negozio su :5173, ora con la voce "Blog"
cd backend  && npm run dev      # opzionale: serve solo per i prezzi nei post
```

E la versione vera, quella che si pubblica:

```bash
cd blog && npm run build        # scrive dist/
cd blog && npm run preview      # la serve
```

---

## 5. La mappa

```
blog/
  astro.config.mjs             site, output: 'static', le tre integrazioni
  src/
    content.config.ts          la forma del frontmatter: un errore ferma la build
    content/blog/*.md          i sei articoli
    layouts/BaseLayout.astro   head, metadati, Open Graph, JSON-LD, header e footer
    components/
      Header.astro             HTML e nient'altro: nessun utente, nessuno stato
      Footer.astro             i tag letti dai post, non scritti a mano
      PostCard.astro           la voce dell'elenco
      ProductCard.astro        la scheda di un articolo del catalogo
      PrezzoLive.tsx           LA sola isola React del sito
    lib/shop.ts                legge il catalogo dall'API, solo in fase di build
    pages/
      index.astro              l'elenco degli articoli
      blog/[...slug].astro     una pagina per post (getStaticPaths)
      tag/[tag].astro          una pagina per argomento
      rss.xml.ts               il feed
      robots.txt.ts            robots.txt con l'indirizzo giusto
      404.astro                diventa 404.html
    styles/global.css          i colori del progetto e la tipografia del Markdown
scripts/
  setup-astro.mjs              la trasformazione completa in un solo file
```

Del negozio e' stata toccata **una riga**: la voce "Blog" in
`frontend/src/components/Header.tsx`.

---

## 6. Da fare a lezione, in ordine

### 6.1 Quanto JavaScript scarica un lettore?

```bash
cd blog && npm run build
Select-String -Path dist/index.html -Pattern "<script" -AllMatches
```

Un solo `<script>`, e contiene i dati strutturati JSON-LD: **zero** JavaScript
eseguibile. La stessa pagina nella SPA scarica l'intera applicazione React prima di
mostrare una parola.

Nella pagina di un post, invece, ci sono tre script: il runtime delle isole e il
componente del prezzo. Si paga solo quello che si usa.

### 6.2 Lo schema che ferma la build

Aprite un post e scrivete `pubdate:` invece di `pubDate:`, oppure tagliate la
`description` a venti caratteri. Poi lanciate la build.

```
[InvalidContentEntryDataError] blog -> portatile-per-studiare-informatica
  data does not match collection schema.
  description: Too small: expected string to have >=50 characters
```

E' il punto in cui si capisce a cosa serve `content.config.ts`: un contenuto
sbagliato non arriva in produzione, si ferma sul computer di chi scrive. Lo stesso
schema genera i tipi, quindi nelle pagine `post.data.pubDate` e' una `Date`.

### 6.3 Il risultato della build

```
10:37:28  ├─ /blog/backup-che-si-fa-davvero/index.html
10:37:28  ├─ /tag/guide/index.html
...
[build] 15 page(s) built in 1.28s
```

Sei post diventano quindici pagine: sei articoli, sette archivi per tag, la home e
la 404, piu' `rss.xml`, `robots.txt` e `sitemap-index.xml`. Nessuno le ha scritte:
nascono dai contenuti.

### 6.4 `dist/` e' una cartella di file

```bash
cd blog && npx serve dist        # oppure: python -m http.server -d dist 8080
```

Niente Node, niente processo da tenere vivo, niente da configurare: funziona su
GitHub Pages, su Netlify, su un vecchio Apache o su una chiavetta USB. E' il
vantaggio piu' concreto di un generatore statico, e si apprezza il giorno in cui il
sito prende traffico senza che nessuno debba intervenire.

### 6.5 L'isola: il prezzo che cambia senza rigenerare niente

1. Costruite e servite il blog (`npm run build && npm run preview`).
2. Dal negozio, come amministratore, cambiate il prezzo di un articolo citato in un
   post (oppure con `PUT /api/products/:id`).
3. Ricaricate la pagina del post **senza rifare la build**.

Sotto il prezzo compare "prezzo aggiornato adesso", con il vecchio sbarrato. Tutto
il resto della pagina e' lo stesso HTML di prima.

Due dettagli da far notare:

- nel componente `.astro` c'e' scritto `client:visible`: il JavaScript dell'isola si
  scarica solo quando la scheda entra nello schermo. Chi non arriva in fondo
  all'articolo non scarica niente;
- con JavaScript disattivato la pagina continua a mostrare il prezzo della
  pubblicazione, con scritto che e' quello. L'isola **aggiunge**, non sostituisce.

### 6.6 Feed e sitemap

```bash
curl -s http://localhost:4321/rss.xml | Select-String "<item>" | Measure-Object -Line
curl -s http://localhost:4321/sitemap-0.xml
curl -s http://localhost:4321/robots.txt
```

Sei articoli nel feed, quattordici indirizzi nella sitemap, e un `robots.txt` che
dice dove sta la sitemap. Il feed e' il modo in cui un blog si fa seguire senza un
algoritmo in mezzo, e costa quindici righe (`src/pages/rss.xml.ts`).

### 6.7 Il collegamento fra i due mondi

Nel negozio, in alto, c'e' ora la voce **Blog**. E' un `<a href>` e non un `<Link>`
del router, e il motivo e' tutta la lezione: non e' un'altra pagina
dell'applicazione, e' un altro sito. Un altro indirizzo, un altro bundle, un'altra
build, un altro ciclo di vita.

---

## 7. Astro o Next? La tabella che serve davvero

| Se dovete... | Scegliete |
|---|---|
| pubblicare contenuti scritti da persone | **Astro** |
| mandare il meno JavaScript possibile | **Astro** |
| pubblicare su un hosting qualunque, senza Node | **Astro** |
| mostrare dati che cambiano da soli (prezzi, scorte) | **Next** |
| rigenerare una pagina alla volta quando un dato cambia | **Next** |
| gestire sessioni, form autenticati, azioni lato server | **Next** |
| fare tutto questo insieme | **tutti e due**, su pezzi diversi |

E questo e' esattamente quello che fa minicommerce: tre rami, tre strumenti, un solo
repository e un solo backend.

---

## 8. Le variabili d'ambiente

`blog/.env.example` le elenca; `blog/.env` e' la copia personale e non va nel
repository.

| Variabile | A cosa serve |
|---|---|
| `SITE_URL` | l'indirizzo pubblico del blog: canonical, sitemap, feed |
| `API_URL` | l'API letta **durante la build** |
| `PUBLIC_API_URL` | la stessa API, ma vista dal browser: la usa l'isola |
| `PUBLIC_APP_URL` | dove gira il negozio, per i link "vai alla scheda" |

La regola di Astro: solo le variabili che cominciano con `PUBLIC_` arrivano nel
browser. Le altre restano sul server (e qui "sul server" vuol dire "sul computer che
fa la build").

Nel negozio c'e' una variabile nuova, facoltativa: `VITE_BLOG_URL`, che serve il
giorno in cui il blog non sta piu' su `localhost:4321`.

---

## 9. Problemi noti

| Sintomo | Causa e rimedio |
|---|---|
| `[blog] non riesco a leggere .../products` | il backend non e' avviato: il blog si costruisce comunque, senza prezzi |
| Le schede prodotto hanno il prezzo sbagliato | e' il prezzo del giorno di build: l'isola lo corregge nel browser, la pagina no |
| `EADDRINUSE :4321` | `npm run dev -- --port 4322` |
| Gli indirizzi nella sitemap dicono `localhost` | `SITE_URL` non impostato prima della build |
| L'isola non si aggiorna | la scheda non e' ancora entrata nello schermo (`client:visible`), oppure il backend e' spento |
| Il prezzo nell'isola non cambia mai in produzione | `PUBLIC_API_URL` punta a `localhost`: va cambiato prima della build |

## 10. Cosa manca, di proposito

- **immagini**: `astro:assets` e il componente `<Image />` ottimizzano e
  ridimensionano in fase di build. Aggiungete una copertina ai post e misurate;
- **paginazione** dell'elenco, con `paginate()` in `getStaticPaths`;
- **MDX**, per mettere componenti dentro gli articoli (`npx astro add mdx`);
- **view transitions**, per la navigazione animata fra le pagine;
- **ricerca interna**, che in un sito statico si fa con un indice generato in fase
  di build (Pagefind) e non con una query al server;
- **un secondo autore**, per vedere a cosa serve un campo `author` tipizzato;
- **la pubblicazione vera**: `dist/` su GitHub Pages, con `SITE_URL` giusto.
