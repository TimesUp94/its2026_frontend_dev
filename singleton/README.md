# minicommerce · versione singleton (Next.js)

La stessa applicazione di `frontend/` + `backend/`, ma in un progetto solo: non
c'è nessuna API REST da chiamare, **è Next.js stesso a interrogare SQLite**.

## La differenza in una riga

| | SPA + Express | singleton |
|---|---|---|
| Lettura catalogo | il browser chiama `GET /api/products` | un Server Component chiama `listProducts()` |
| Scrittura | `POST /api/products` con token Bearer | una Server Action scrive su SQLite |
| Sessione | JWT in `localStorage` | JWT in un cookie `httpOnly` |
| Processi da avviare | 2 (Vite + Express) | 1 |

Il catalogo arriva al browser già renderizzato: nell'HTML della home ci sono
tutti e 16 gli articoli, e non parte nessuna richiesta verso un backend esterno.

## Avvio

Serve Node.js 24 o superiore.

```bash
npm install
npm run db:push   # crea le tabelle (solo la prima volta)
npm run db:seed   # categorie, articoli e utenti di prova
npm run dev       # http://localhost:3000
```

Le porte non si pestano i piedi con il resto del repository: Express usa la
3001, Vite la 5173, questo progetto la 3000.

## Account di prova

| Ruolo | Email | Password |
|---|---|---|
| Amministratore | `admin@minicommerce.dev` | `admin123` |
| Cliente | `cliente@minicommerce.dev` | `cliente123` |

L'amministratore gestisce il catalogo, il cliente compra: sono due percorsi
distinti, come nella SPA.

## Struttura

```
app/                 le pagine (Server Component dove non serve interattività)
  page.tsx           catalogo con filtri e ordinamento nella query string
  prodotti/[id]/     scheda articolo
  login/             accesso e registrazione cliente
  carrello/          carrello e checkout dimostrativo
  admin/             gestione catalogo (solo amministratori)
components/          componenti condivisi, 'use client' solo dove serve
lib/db/              schema Drizzle e connessione a SQLite
lib/session.ts       cookie di sessione firmato
server/              query di lettura
server/actions/      Server Action: tutte le scritture passano da qui
scripts/seed.ts      popolamento del database
```

## Database

Di default il file è `singleton/minicommerce.db`, indipendente da quello del
backend Express. Per far lavorare le due versioni sugli stessi dati basta
impostare `DATABASE_URL=../backend/minicommerce.db` (vedi `.env.example`).

| Comando | Effetto |
|---|---|
| `npm run db:push` | allinea lo schema al file `lib/db/schema.ts` |
| `npm run db:seed` | svuota le tabelle e reinserisce i dati di prova |
| `npm run db:reset` | cancella il database e rifà push + seed |

## Note di implementazione

- **Dove gira cosa.** `lib/db/index.ts` è marcato `server-only`: se un
  componente client provasse a importarlo, la build fallirebbe invece di
  spedire il driver SQLite al browser.
- **Validazione.** Le Server Action rivalidano tutto lato server, esattamente
  come faceva l'API: la categoria di un articolo deve esistere a database, non
  viene mai creata implicitamente.
- **Transazioni.** L'invio dell'ordine registra ordine e righe e svuota il
  carrello dentro un'unica transazione, come la rotta `POST /api/orders`.
- **better-sqlite3** è dichiarato in `serverExternalPackages`: è un modulo
  nativo e deve restare un `require()` di Node, non essere impacchettato.
