# minicommerce

Piccolo e-commerce di articoli informatici (PC, mouse, smartphone, accessori…).

- **Backend**: Node.js 24 (TypeScript nativo), Express 5.2.1, SQLite + Drizzle ORM, auth JWT email/password
- **Frontend**: React 19.3 (Vite), ShadCN UI, Tailwind CSS v4, Axios, React Router

## Requisiti

Node.js >= 24 (es. `nvm use 24.21.0`).

## Avvio

Backend (porta 3001):

```bash
cd backend
npm install
npm run db:push   # crea le tabelle SQLite (solo la prima volta)
npm run db:seed   # popola articoli demo e utente admin (solo la prima volta)
npm run dev
```

Frontend (porta 5173, proxy `/api` → 3001):

```bash
cd frontend
npm install
npm run dev
```

App su http://localhost:5173

## Credenziali amministratore

- Email: `admin@minicommerce.dev`
- Password: `admin123`

(Impostate dal seed; il segreto JWT si può cambiare con la variabile d'ambiente `JWT_SECRET`.)

## Funzionalità

- **Catalogo** (`/`): lista articoli con ricerca testuale, filtro per categoria e fascia di prezzo, ordinamento per nome/prezzo/disponibilità/data con direzione asc/desc.
- **Login** (`/login`): autenticazione email/password, token JWT (scadenza 8h).
- **Admin** (`/admin`, protetta): tabella articoli con creazione, modifica ed eliminazione.

## Modello dati

`categories` e `products` sono legate da una relazione uno-a-molti: una categoria
raggruppa molti articoli, ogni articolo appartiene a una sola categoria tramite
`products.category_id` (foreign key con `ON DELETE RESTRICT`, quindi una categoria
che ha articoli non può essere cancellata).

```
categories (id, name UNIQUE, description, created_at)
    │ 1
    │
    │ N
products   (id, name, description, category_id → categories.id, brand,
            price, stock, image_url, created_at)
```

Le risposte sugli articoli includono sia `categoryId` sia `category` (il nome),
così i client hanno l'etichetta senza una seconda chiamata.

## API principali

| Metodo | Rotta | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/auth/login` | – | Login, restituisce `{ token, user }` |
| GET | `/api/categories` | – | Elenco categorie con `productCount` |
| GET | `/api/categories/:id` | – | Dettaglio di una categoria |
| GET | `/api/categories/:id/products` | – | Articoli di una categoria |
| GET | `/api/products` | – | Lista articoli; query: `search`, `category` (nome), `categoryId`, `brand`, `minPrice`, `maxPrice`, `sort` (`name`\|`price`\|`stock`\|`category`\|`createdAt`), `order` (`asc`\|`desc`) |
| GET | `/api/products/categories` | – | Solo i nomi delle categorie (`string[]`) |
| GET | `/api/products/:id` | – | Dettaglio articolo |
| POST | `/api/products` | admin | Crea articolo (`categoryId` oppure `category` con il nome di una categoria esistente) |
| PUT | `/api/products/:id` | admin | Aggiorna articolo |
| DELETE | `/api/products/:id` | admin | Elimina articolo |

Le categorie non vengono create implicitamente: se `category`/`categoryId` non
corrisponde a una riga esistente la richiesta viene respinta con 400.

## Script del database

| Comando | Effetto |
|---|---|
| `npm run db:push` | Allinea lo schema SQLite a `src/db/schema.ts`. Usa `--force`: su un DB di sviluppo applica anche le modifiche che comportano perdita di dati, senza chiedere conferma |
| `npm run db:seed` | Svuota le tabelle e reinserisce categorie, articoli e utente admin |
| `npm run db:reset` | Cancella il file del database ed esegue push + seed da zero |
