# MiniCommerce desktop con Electron

Questo documento descrive la versione desktop di minicommerce costruita con
**Electron**. Il frontend React resta lo stesso: cambia solo il contenitore in cui
viene eseguito e si aggiunge un ponte verso il sistema operativo.

Tutto quello che c'è qui dentro lo prepara un unico script:

```bash
node scripts/setup-electron.mjs
```

## A cosa serve

L'app web gira dentro un browser: non può aprire una vera finestra di salvataggio,
non ha un'icona nella barra delle applicazioni, non si installa. Electron impacchetta
Chromium e Node in un'applicazione nativa e mette a disposizione le API del sistema
operativo, pur continuando a far girare la nostra interfaccia React.

L'architettura è a tre pezzi:

| Pezzo | File | Che cos'è |
|---|---|---|
| **main** | `desktop/src/main.ts` | Processo principale, Node completo: finestre, menu, tray, dialoghi, file |
| **preload** | `desktop/src/preload.ts` | Ponte isolato: l'unica superficie che il renderer può chiamare |
| **renderer** | `frontend/` | L'app React di sempre, servita da Vite in sviluppo e da `file://` in produzione |

## Prerequisiti

- Node.js 24 o superiore (verificato con Node 24.19.0, npm 11.17.0)
- il **backend acceso**: anche l'app desktop legge i dati da `http://localhost:3001`

```bash
cd backend
npm install
npm run db:push    # solo la prima volta
npm run db:seed    # solo la prima volta
npm run dev
```

## Lo script di setup

```bash
node scripts/setup-electron.mjs
```

Parte da un clone pulito di `master` e fa, nell'ordine:

1. controlli preliminari (siamo nella radice giusta? versione di Node?)
2. le patch condizionali al frontend (router, `baseURL`, `base` degli asset, `.env.desktop`)
3. il ponte di piattaforma e il pulsante "Esporta catalogo" nella pagina admin
4. il guscio Electron in `desktop/` (main, preload, electron-builder, avvio in sviluppo)
5. le icone (`desktop/build/icon.png`, `tray.png`, generate a codice)
6. `npm install` nel frontend e in `desktop/`
7. `npm run build` del guscio (esbuild) e `npm run build:desktop` del renderer

È **idempotente**: rilanciarlo non duplica le patch e non sovrascrive i file già
generati. Opzioni utili:

| Opzione | Effetto |
|---|---|
| `--forza` | riscrive anche i file generati che esistono già |
| `--salta-install` | non esegue `npm install` |
| `--salta-build` | non compila guscio e renderer |

Se un file del frontend è stato modificato a mano e il testo da sostituire non si
trova più, lo script si ferma con un errore che mostra il testo atteso, invece di
scrivere a caso.

## Come si avvia

### Sviluppo (hot reload)

```bash
cd desktop
npm run dev
```

`desktop/scripts/dev.mjs` compila il guscio con esbuild, avvia il dev server di Vite
in modalità `desktop`, **aspetta che risponda** e solo allora lancia Electron con
`VITE_DEV_SERVER_URL`. Quando si chiude la finestra, il dev server viene chiuso
insieme all'app. Non servono `wait-on` né `concurrently`.

Se la porta 5173 è occupata da un altro progetto:

```bash
VITE_PORT=5180 npm run dev          # su Windows: set VITE_PORT=5180 && npm run dev
```

### Come in produzione (file compilati)

```bash
cd desktop
npm start
```

Compila guscio e renderer e apre Electron sui file statici
(`frontend/dist/index.html`, caricato con `file://`).

### Pacchetto installabile

```bash
cd desktop
npm run package
```

Il risultato finisce in `desktop/release/`. La configurazione
(`desktop/electron-builder.yml`) prevede `nsis` su Windows, `AppImage` + `deb` su
Linux, `dmg` su macOS, con `appId` `it.its.minicommerce`. Non c'è nessuna firma del
codice: all'avvio Windows mostrerà l'avviso di SmartScreen.

## Cosa è stato modificato nel frontend, e perché

Sono le "tre sorprese": in tutti e tre i casi il comportamento web resta il default
e quello desktop si attiva con una variabile d'ambiente.

### 1. `src/main.tsx` — il router

```ts
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter
```

`BrowserRouter` si appoggia alla History API e presuppone un server che risponda
`index.html` su qualunque percorso. Con `file://` quel server non c'è: aprire
`/admin` significherebbe cercare un file che non esiste. In desktop si usa
`HashRouter` (`index.html#/admin`), sul web non cambia niente.

### 2. `src/lib/api.ts` — l'indirizzo del backend

```ts
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })
```

Sul web `/api` funziona grazie al proxy del dev server di Vite. Nell'app desktop il
proxy non esiste e l'origine è `file://`, quindi serve l'URL assoluto
`http://localhost:3001/api`. Il backend ha già `cors()` abilitato, quindi non è stato
toccato.

### 3. `vite.config.ts` — i percorsi degli asset

```ts
base: command === 'build' && VITE_DESKTOP === '1' ? './' : '/'
```

Vite scrive `<script src="/assets/index-xxxx.js">`. Con `file://` quel percorso
assoluto punta alla radice del disco e la pagina resta bianca. Nella build desktop
serve `./assets/...`.

### 4. `frontend/.env.desktop`

Raccoglie le tre variabili e viene letto da `vite build --mode desktop` e
`vite --mode desktop`:

```
VITE_DESKTOP=1
VITE_ROUTER=hash
VITE_API_URL=http://localhost:3001/api
```

### 5. `src/lib/piattaforma.ts` — l'astrazione

```ts
export type NomePiattaforma = 'web' | 'electron' | 'tauri'

export interface Piattaforma {
  nome: NomePiattaforma
  notifica(titolo: string, corpo: string): Promise<void>
  esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
}

export function usaPiattaforma(): Piattaforma
```

La UI chiama sempre questa interfaccia e non sa dove sta girando. L'implementazione
`web` (notifiche del browser e download di un `Blob`) è sempre presente come
fallback; se `window.minicommerce` esiste, si usa il ponte di Electron.
I tipi di `window.minicommerce` stanno in `src/types/minicommerce-desktop.d.ts`.

### 6. `src/pages/AdminPage.tsx` — il pulsante "Esporta catalogo"

Genera il CSV degli articoli (`id;nome;categoria;marca;prezzo;disponibilità`,
separatore `;` come si aspetta Excel in italiano) e chiama `esportaCatalogo()`.
Nel browser scarica un file, nell'app desktop apre la finestra di salvataggio
nativa. Funziona in entrambi i casi.

## Il guscio Electron

```
desktop/
  package.json            script npm e dipendenze (electron, electron-builder, esbuild)
  tsconfig.json           solo type-check: a compilare è esbuild
  electron-builder.yml    nsis / AppImage + deb / dmg, appId it.its.minicommerce
  src/main.ts             processo principale
  src/preload.ts          ponte con contextBridge
  scripts/dev.mjs         avvio in sviluppo (Vite -> attesa -> Electron)
  build/                  icone generate dallo script di setup
```

`main.ts` e `preload.ts` sono TypeScript compilati con esbuild in un unico comando,
senza generatori di progetto e senza electron-vite: il guscio deve restare leggibile
riga per riga.

```bash
esbuild src/main.ts src/preload.ts --bundle --platform=node --format=cjs --external:electron --outdir=dist
```

### Sicurezza

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- nessun uso del modulo `remote`
- `setWindowOpenHandler` e `will-navigate`: i link esterni si aprono nel browser di
  sistema, l'app non naviga fuori da sé stessa
- il main **valida tutto** quello che arriva dal renderer: tipo e lunghezza massima
  del CSV (5 MB) e del testo delle notifiche, nome file ridotto al solo `basename`
  con i caratteri sospetti sostituiti ed estensione `.csv` forzata
- gli handler IPC accettano messaggi solo dalla finestra principale

### Ciclo di vita

- la finestra si mostra su `ready-to-show` (niente lampo bianco)
- `app.requestSingleInstanceLock()`: la seconda copia cede il turno alla prima
- su Windows e Linux chiudere la finestra chiude l'app, su macOS no (`activate`)
- tray con le voci **Apri** ed **Esci**

### Il ponte

`preload.ts` espone `window.minicommerce` con tre sole cose: `piattaforma`,
`notifica`, `esportaCatalogo`. Mai `ipcRenderer` diretto.

Il CSV viene scritto dal main con il **BOM UTF-8** davanti: senza, Excel apre il file
con gli accenti sbagliati (`disponibilità` diventa `disponibilitÃ `).

## Verificato

Su Windows 11, Node 24.19.0, Electron 44.9.0:

- `node scripts/setup-electron.mjs` su un clone pulito, e poi una seconda volta
  (nessuna patch duplicata, nessun file sovrascritto)
- `npm run build` del frontend (comprende `tsc -b`) e `npm run lint`: nessun errore
  nuovo
- `npm run typecheck` e `npm run build` del guscio
- `npm start`: finestra aperta su `file:///.../frontend/dist/index.html`, catalogo e
  pagina admin funzionanti con i dati del backend, `window.minicommerce.piattaforma`
  uguale a `electron`, `require` e `process` non raggiungibili dal renderer
- esportazione del catalogo: finestra di salvataggio nativa, file scritto con il BOM
  (`EF BB BF`), accenti corretti, `false` quando si annulla
- notifica di sistema inviata dal main
- `npm run dev`: Vite in modalità desktop, attesa del server, Electron sulla finestra
  giusta, e chiusura del dev server quando l'app si chiude
- `npm run package`: installer NSIS non firmato prodotto in `desktop/release/`

## Problemi noti

- **Backend obbligatorio.** L'app desktop non include il backend: senza
  `npm run dev` in `backend/` il catalogo resta vuoto. Impacchettare anche il
  backend è un passo successivo.
- **Porta 5173 occupata.** Se un altro progetto è in ascolto su `0.0.0.0:5173`,
  `localhost` può risolvere sull'altro server. `dev.mjs` usa `127.0.0.1` esplicito e
  verifica che la pagina servita sia davvero minicommerce; in caso di conflitto si
  cambia porta con `VITE_PORT`.
- **Nessuna firma del codice.** Gli installer non sono firmati: Windows mostra
  SmartScreen, macOS richiede l'autorizzazione manuale.
- **Pacchetti non Windows non provati.** `AppImage`, `deb` e `dmg` sono configurati
  ma sono stati generati solo per Windows (`nsis`): su macOS e Linux la build va
  eseguita sul sistema corrispondente.
- **Notifiche su Windows.** Funzionano con `app.setAppUserModelId`, ma l'icona
  mostrata è quella di Electron finché l'app non viene installata dall'installer.
