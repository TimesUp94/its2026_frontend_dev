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

## API principali

| Metodo | Rotta | Auth | Descrizione |
|---|---|---|---|
| POST | `/api/auth/login` | – | Login, restituisce `{ token, user }` |
| GET | `/api/products` | – | Lista articoli; query: `search`, `category`, `brand`, `minPrice`, `maxPrice`, `sort` (`name`\|`price`\|`stock`\|`createdAt`), `order` (`asc`\|`desc`) |
| GET | `/api/products/categories` | – | Categorie distinte |
| GET | `/api/products/:id` | – | Dettaglio articolo |
| POST | `/api/products` | admin | Crea articolo |
| PUT | `/api/products/:id` | admin | Aggiorna articolo |
| DELETE | `/api/products/:id` | admin | Elimina articolo |
