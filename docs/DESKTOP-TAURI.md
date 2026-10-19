# minicommerce desktop con Tauri 2

## A cosa serve

Lo stesso frontend React del corso, impacchettato come applicazione desktop con
[Tauri 2](https://v2.tauri.app). La finestra non e' un browser Chromium incluso
nel pacchetto: Tauri usa la WebView del sistema operativo (WebView2 su Windows,
WebKit su macOS e Linux) e tiene il codice nativo in un binario Rust. Il backend
Express resta un processo separato su `http://localhost:3001`.

Tutta la trasformazione da master a questa versione sta in un unico script:
`scripts/setup-tauri.mjs`.

## Prerequisiti

- Node.js 24 (verificato con 24.19) e npm 11.
- Toolchain Rust stabile, installata con [rustup](https://rustup.rs)
  (verificato con cargo/rustc 1.99). Su Windows serve anche il linker MSVC
  (Visual Studio Build Tools con "Desktop development with C++").
- **Windows:** WebView2, gia' presente su Windows 10/11 aggiornati. Se manca,
  l'applicazione non apre la finestra: si installa da Microsoft Evergreen Runtime.
- Il backend del progetto in esecuzione (`cd backend && npm run dev`) se si
  vogliono vedere i dati.

## Trasformazione con un comando

Da un clone pulito di master, nella radice del repository:

```
git checkout master
git checkout desktop/tauri -- scripts/setup-tauri.mjs   # lo script vive su questo branch
node scripts/setup-tauri.mjs
```

Lo script stampa ogni comando che esegue e si puo' rilanciare quante volte si
vuole: se una patch c'e' gia' la salta, non la duplica. Con
`node scripts/setup-tauri.mjs --con-cargo-check` esegue anche `cargo check`
alla fine (la prima volta scarica e compila le dipendenze Rust: diversi minuti).

Cosa fa, nell'ordine: controlla i prerequisiti, `npm install` nel frontend,
applica le tre patch condivise, crea l'astrazione di piattaforma e il pulsante
di esportazione, installa `@tauri-apps/cli` e `@tauri-apps/api`, aggiunge gli
script npm, lancia `tauri init`, aggiunge i plugin con `tauri add`, scrive la
configurazione e i permessi, genera le icone e infine fa la build del frontend.

## Sviluppo

```
cd backend && npm run dev          # in un terminale: API su :3001
cd frontend && npm run desktop:dev # in un altro: Vite su :5173 + finestra Tauri
```

`desktop:dev` e' `tauri dev`: fa partire Vite con `beforeDevCommand` e apre la
finestra su `http://localhost:5173`. In sviluppo l'app resta identica alla
versione web (BrowserRouter, chiamate a `/api` girate dal proxy di Vite); la
prima compilazione Rust richiede diversi minuti, le successive sono veloci.

## Pacchetto

```
cd frontend
npm run desktop:build          # tauri build: installer in release
npx tauri build --debug        # build piu' rapida, senza ottimizzazioni
```

`tauri build` lancia `beforeBuildCommand` (`npm run build:desktop`, cioe'
`tsc -b && vite build --mode desktop`) e poi compila il binario Rust che si
porta dentro `frontend/dist`. I risultati finiscono in
`frontend/src-tauri/target/{debug,release}/` e gli installer in
`.../bundle/`.

## Cosa e' stato modificato nel frontend, e perche'

| File | Modifica | Perche' |
| --- | --- | --- |
| `src/main.tsx` | `const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter` | Nel pacchetto la pagina arriva dal protocollo interno di Tauri (o da `file://`) e non c'e' un server che riscriva le rotte: con BrowserRouter un reload su `/admin` non troverebbe nulla. Sul web il valore non e' impostato e resta BrowserRouter. |
| `src/lib/api.ts` | `baseURL: import.meta.env.VITE_API_URL ?? '/api'` | Il proxy di Vite esiste solo in sviluppo: nel pacchetto serve l'URL assoluto `http://localhost:3001/api`. Il default lascia il comportamento web invariato. |
| `vite.config.ts` | `base` condizionale (`'./'` con `--mode desktop` o `VITE_DESKTOP=1`), `server.strictPort` e `server.watch.ignored` | Con `base: '/'` l'index.html del pacchetto cercherebbe `/assets/...` nella radice e resterebbe bianco. `strictPort` evita che Vite si sposti su un'altra porta mentre `devUrl` punta alla 5173. Senza escludere `**/src-tauri/**` dal watcher, `tauri dev` muore con `EBUSY ... target\debug\deps\*.dll` mentre cargo compila. |
| `.env.desktop` (nuovo) | `VITE_ROUTER`, `VITE_API_URL`, `VITE_DESKTOP` | Caricato solo da `vite build --mode desktop`: la build web non cambia. |
| `src/lib/piattaforma.ts` (nuovo) | `usaPiattaforma()` con implementazione `web` e `tauri` | Le pagine non sanno dove girano: stessa interfaccia per notifiche ed esportazione. |
| `src/lib/comandi-tauri.ts` (nuovo) | `contaEsauriti()` | Chiama il comando Rust `conta_esauriti` con `invoke`, con lo stesso calcolo in JS come fallback web. |
| `src/pages/AdminPage.tsx` | pulsante "Esporta catalogo" | Funzionalita' visibile che attraversa il ponte: genera il CSV e lo passa a `esportaCatalogo()`. |
| `package.json` | script `tauri`, `build:desktop`, `desktop:dev`, `desktop:build` | Comandi di lezione sempre a portata di mano. |

Il pulsante funziona anche nel browser: lì l'implementazione `web` scarica il
file con un `<a download>` su un Blob e usa le Notification del browser.
Nella finestra Tauri passa invece dal dialogo nativo di salvataggio
(`@tauri-apps/plugin-dialog`) e scrive il file con
`@tauri-apps/plugin-fs`.

## Il guscio nativo

```
frontend/src-tauri/
  Cargo.toml                  crate "minicommerce" + plugin dialog/fs/notification
  tauri.conf.json             identifier it.its.minicommerce, finestra 1280x800, CSP
  capabilities/default.json   i permessi concessi alla finestra "main"
  src/main.rs                 entry point, chiama app_lib::run()
  src/lib.rs                  Builder, plugin e il comando conta_esauriti
  icons/                      generate da src/assets/hero.png
```

### Permessi

In Tauri quello che non e' elencato nelle capabilities non e' richiamabile dal
frontend, anche se il plugin e' compilato dentro. `tauri add` aggiunge i set
`<plugin>:default`, che sono piu' larghi del necessario; qui la lista e' stata
ridotta a mano a:

```
core:default
dialog:allow-save
fs:allow-write-text-file
notification:allow-is-permission-granted
notification:allow-request-permission
notification:allow-notify
```

Il plugin fs di per se' non apre tutto il disco: la scrittura passa perche' il
comando `save` del plugin dialog aggiunge il file scelto dall'utente allo scope
di fs (si vede in `tauri-plugin-dialog`, `commands.rs`, `scope.allow_file()`).
I nomi dei permessi vengono validati in compilazione da `tauri-build`: se se ne
scrive uno sbagliato, `cargo check` fallisce. Togliere una riga da questo elenco
e rilanciare l'app e' la dimostrazione da fare a lezione.

### Comando Rust

```rust
#[tauri::command]
fn conta_esauriti(scorte: Vec<i64>) -> usize {
    scorte.iter().filter(|scorta| **scorta <= 0).count()
}
```

Registrato con `.invoke_handler(tauri::generate_handler![conta_esauriti])` e
chiamato dal frontend con
`invoke('conta_esauriti', { scorte })` dentro `src/lib/comandi-tauri.ts`.
Il risultato finisce nel messaggio del toast dopo l'esportazione.

### CSP

`app.security.csp` permette `data:` per le immagini (gli articoli hanno
l'immagine come data URL), gli stili inline di Tailwind/shadcn, `ipc:` per
`invoke` e le chiamate a `http://localhost:3001`. Se il backend cambia porta o
host va aggiornata anche questa riga, altrimenti le chiamate vengono bloccate
dalla WebView.

## Cosa e' stato verificato

Su Windows 11, Node 24.19, cargo 1.99:

- `node scripts/setup-tauri.mjs` da un clone pulito di master, e una seconda
  volta di seguito (secondo giro: tutto saltato, nessuna patch duplicata).
- `npm run build:desktop` (`tsc -b` incluso) e `npx oxlint`: nessun errore nuovo.
- `cargo check` dentro `src-tauri`: pulito.
- `npx tauri build --debug`: binario + installer MSI e NSIS.
- Avvio dell'eseguibile `target/debug/minicommerce.exe`: la finestra si apre
  (titolo "minicommerce") e il bundle chiama davvero le API
  (`GET /api/products` con origine `http://tauri.localhost`), quindi router,
  percorsi degli asset e CSP sono a posto.
- `npm run desktop:dev` (`tauri dev`).

Non verificato a mano: il clic sul pulsante "Esporta catalogo" dentro la
finestra (dialogo nativo, scrittura del file e notifica) e il comportamento su
macOS e Linux.

## Problemi noti

- Il backend non viene avviato da Tauri: va lanciato a parte. Senza backend
  l'app apre la finestra e mostra gli errori di rete dei toast.
- `npm install` nel frontend segnala vulnerabilita' npm audit ereditate da
  master: non sono state toccate.
- Le icone nascono da `src/assets/hero.png`, che e' 343x361 e non quadrata:
  `tauri icon --fit contain` la centra su una tela trasparente e la ingrandisce,
  quindi l'icona e' sfocata. Per la produzione serve un PNG quadrato 1024x1024.
- La prima compilazione Rust e' lenta (diversi minuti) e scarica ~400 crate.
