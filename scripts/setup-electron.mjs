#!/usr/bin/env node
// -----------------------------------------------------------------------------
// setup-electron.mjs
//
// Trasforma il minicommerce "web" in un'app desktop Electron.
// Esegue da solo tutti i passi spiegati a lezione:
//   1. controlli preliminari
//   2. patch condivise al frontend (router, baseURL, base degli asset, .env)
//   3. ponte di piattaforma + export CSV nella pagina admin
//   4. guscio Electron esplicito in desktop/ (main, preload, builder)
//   5. icone
//   6. npm install
//   7. compilazione del guscio e build del renderer
//
// Uso:    node scripts/setup-electron.mjs [--forza] [--salta-install] [--salta-build]
//
// Solo moduli "node:", nessuna dipendenza esterna. Idempotente: se una patch c'e'
// gia' non viene riapplicata, e i file generati non vengono sovrascritti (--forza).
// -----------------------------------------------------------------------------

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARGOMENTI = new Set(process.argv.slice(2))
const FORZA = ARGOMENTI.has('--forza')
const SALTA_INSTALL = ARGOMENTI.has('--salta-install')
const SALTA_BUILD = ARGOMENTI.has('--salta-build')
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'

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

function errore(testo) {
  console.error(`\nERRORE: ${testo}\n`)
  process.exit(1)
}

/** Ogni comando esterno viene stampato prima di partire: sono quelli delle slide. */
function esegui(comando, argomenti, cwd) {
  const riga = `${comando} ${argomenti.join(' ')}`
  console.log(`\n> ${riga}`)
  // shell: true perche' su Windows npm e' uno script .cmd
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
        'Il file e\' stato modificato a mano? Riparti da un clone pulito di master.',
    )
  }
  if (occorrenze > 1) {
    errore(`in ${relativo} il testo da sostituire (${nota}) compare ${occorrenze} volte: patch ambigua.`)
  }
  fs.writeFileSync(percorso, originale.replace(cercato, sostituto))
  info(`~ ${relativo}: ${nota}`)
  if (!modificati.includes(relativo)) modificati.push(relativo)
  return true
}

/** Crea un file generato da noi. Se esiste lo lascia stare, salvo --forza. */
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

function creaBinario(relativo, buffer) {
  const percorso = assoluto(relativo)
  if (fs.existsSync(percorso) && !FORZA) {
    info(`= ${relativo} esiste gia'`)
    return false
  }
  fs.mkdirSync(path.dirname(percorso), { recursive: true })
  fs.writeFileSync(percorso, buffer)
  info(`+ ${relativo}`)
  if (!creati.includes(relativo)) creati.push(relativo)
  return true
}

/** Aggiunge script npm a un package.json senza toccare il resto. */
function aggiungiScript(relativo, nuoviScript) {
  const percorso = assoluto(relativo)
  const pacchetto = JSON.parse(leggi(relativo))
  pacchetto.scripts ??= {}
  let cambiato = false
  for (const [nome, comando] of Object.entries(nuoviScript)) {
    if (pacchetto.scripts[nome] === comando) continue
    if (pacchetto.scripts[nome] && !FORZA) {
      info(`= ${relativo}: script "${nome}" gia' presente, lasciato invariato`)
      continue
    }
    pacchetto.scripts[nome] = comando
    info(`~ ${relativo}: script "${nome}"`)
    cambiato = true
  }
  if (cambiato) {
    fs.writeFileSync(percorso, `${JSON.stringify(pacchetto, null, 2)}\n`)
    if (!modificati.includes(relativo)) modificati.push(relativo)
  }
  return cambiato
}

// --------------------------------------------------------------------------- //
// 1. Controlli preliminari                                                    //
// --------------------------------------------------------------------------- //

titolo('Controlli preliminari')

for (const atteso of ['frontend/package.json', 'frontend/src/main.tsx', 'backend/package.json']) {
  if (!fs.existsSync(assoluto(atteso))) {
    errore(`non trovo ${atteso}: esegui lo script dalla radice del repository minicommerce.`)
  }
}
const maggiore = Number(process.versions.node.split('.')[0])
if (maggiore < 20) errore(`serve Node 20 o superiore (trovato ${process.versions.node}).`)
info(`repository: ${RADICE}`)
info(`Node ${process.versions.node}`)
if (FORZA) info('--forza: i file generati verranno riscritti')

// --------------------------------------------------------------------------- //
// 2. Patch condivise al frontend                                              //
// --------------------------------------------------------------------------- //

titolo('Patch al frontend (le tre sorprese del desktop)')

// (a) Il router: con file:// non c'e' nessun server che risolva /admin
patch(
  'frontend/src/main.tsx',
  "import { BrowserRouter } from 'react-router-dom'",
  "import { BrowserRouter, HashRouter } from 'react-router-dom'",
  'importa anche HashRouter',
)
patch(
  'frontend/src/main.tsx',
  `createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)`,
  `// Con file:// non c'e' un server che gestisca la history: in desktop serve l'hash router.
// VITE_ROUTER arriva da .env.desktop, sul web resta BrowserRouter.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)`,
  'router condizionale',
)

// (b) La baseURL: nel desktop il proxy di Vite non esiste
patch(
  'frontend/src/lib/api.ts',
  "export const api = axios.create({ baseURL: '/api' })",
  `// Sul web resta il proxy di Vite ('/api'); nel desktop serve l'URL assoluto del backend,
// che arriva da VITE_API_URL (vedi .env.desktop).
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })`,
  'baseURL da variabile d\'ambiente',
)

// (c) I percorsi degli asset: con file:// un base assoluto non si risolve
patch(
  'frontend/vite.config.ts',
  "import { defineConfig } from 'vite'",
  "import { defineConfig, loadEnv } from 'vite'",
  'importa loadEnv',
)
patch(
  'frontend/vite.config.ts',
  `// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],`,
  `// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  // Nella build desktop i percorsi degli asset devono essere relativi: aperto con file://
  // un base assoluto come '/assets/index.js' punterebbe alla radice del disco.
  // VITE_DESKTOP arriva da .env.desktop (o dall'ambiente), vedi --mode desktop.
  base:
    command === 'build' &&
    (process.env.VITE_DESKTOP ?? loadEnv(mode, import.meta.dirname).VITE_DESKTOP) === '1'
      ? './'
      : '/',
  plugins: [react(), tailwindcss()],`,
  'base condizionale per il desktop',
)
patch(
  'frontend/vite.config.ts',
  `  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})`,
  `  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))`,
  'chiusura della config a funzione',
)

// (d) La configurazione della build desktop
crea(
  'frontend/.env.desktop',
  `# Variabili usate solo dalla modalita' desktop: "vite build --mode desktop"
# e "vite --mode desktop" (dev server usato dal guscio Electron).

# Percorsi degli asset relativi, per poter aprire index.html da file://
VITE_DESKTOP=1

# Niente server di history dietro file://: il routing passa dall'hash (#/admin)
VITE_ROUTER=hash

# Nel desktop il proxy di Vite non esiste: il backend si chiama per URL assoluto
VITE_API_URL=http://localhost:3001/api
`,
)

aggiungiScript('frontend/package.json', {
  'dev:desktop': 'vite --mode desktop --strictPort',
  'build:desktop': 'tsc -b && vite build --mode desktop',
})

// --------------------------------------------------------------------------- //
// 3. Ponte di piattaforma + export CSV                                        //
// --------------------------------------------------------------------------- //

titolo('Ponte di piattaforma e esportazione del catalogo')

crea(
  'frontend/src/types/minicommerce-desktop.d.ts',
  `// Tipi del ponte che il preload di Electron espone su window.minicommerce.
// Nel browser la proprieta' non esiste: per questo e' opzionale.
export {}

declare global {
  interface PonteMinicommerce {
    piattaforma: 'electron'
    notifica(titolo: string, corpo: string): Promise<void>
    /** false quando l'utente annulla la finestra di salvataggio */
    esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
  }

  interface Window {
    minicommerce?: PonteMinicommerce
  }
}
`,
)

crea(
  'frontend/src/lib/piattaforma.ts',
  `// Astrazione di piattaforma: la UI chiama sempre questa interfaccia e non sa
// se sta girando nel browser, in Electron o in Tauri.

export type NomePiattaforma = 'web' | 'electron' | 'tauri'

export interface Piattaforma {
  nome: NomePiattaforma
  notifica(titolo: string, corpo: string): Promise<void>
  /** false quando l'utente annulla il salvataggio */
  esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
}

/** Senza il BOM Excel apre il CSV con gli accenti sbagliati */
const BOM = '\\ufeff'

/** Implementazione di riserva: funziona in qualunque browser, anche senza guscio nativo. */
const piattaformaWeb: Piattaforma = {
  nome: 'web',
  async notifica(titolo, corpo) {
    if (!('Notification' in window)) return
    const permesso =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    if (permesso === 'granted') new Notification(titolo, { body: corpo })
  },
  async esportaCatalogo(csv, nomeFile) {
    // Nel browser non esiste una vera finestra di salvataggio: si scarica un Blob
    const url = URL.createObjectURL(new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = nomeFile
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return true
  },
}

function piattaformaElectron(ponte: PonteMinicommerce): Piattaforma {
  return {
    nome: 'electron',
    // Il BOM e il dialogo di salvataggio li mette il processo principale
    notifica: (titolo, corpo) => ponte.notifica(titolo, corpo),
    esportaCatalogo: (csv, nomeFile) => ponte.esportaCatalogo(csv, nomeFile),
  }
}

export function usaPiattaforma(): Piattaforma {
  const ponte = window.minicommerce
  if (ponte?.piattaforma === 'electron') return piattaformaElectron(ponte)
  return piattaformaWeb
}
`,
)

patch(
  'frontend/src/pages/AdminPage.tsx',
  "import { Pencil, Plus, Trash2 } from 'lucide-react'",
  "import { Download, Pencil, Plus, Trash2 } from 'lucide-react'",
  'icona Download',
)
patch(
  'frontend/src/pages/AdminPage.tsx',
  "import { useAuth } from '@/lib/auth'",
  `import { useAuth } from '@/lib/auth'
import { usaPiattaforma } from '@/lib/piattaforma'`,
  'import di usaPiattaforma',
)
patch(
  'frontend/src/pages/AdminPage.tsx',
  'export function AdminPage() {',
  `const COLONNE_CSV = ['id', 'nome', 'categoria', 'marca', 'prezzo', 'disponibilità'] as const

/** Excel in italiano si aspetta il punto e virgola; le virgolette si raddoppiano */
function campoCsv(valore: string): string {
  return /[";\\r\\n]/.test(valore) ? \`"\${valore.replaceAll('"', '""')}"\` : valore
}

export function AdminPage() {`,
  'helper CSV',
)
patch(
  'frontend/src/pages/AdminPage.tsx',
  `  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">`,
  `  const handleExport = async () => {
    // Stessa UI nel browser e nel desktop: cambia solo chi salva il file
    const piattaforma = usaPiattaforma()
    const righe = [
      [...COLONNE_CSV],
      ...products.map((product) => [
        String(product.id),
        product.name,
        product.category,
        product.brand,
        product.price.toFixed(2),
        String(product.stock),
      ]),
    ]
    const csv = righe.map((riga) => riga.map(campoCsv).join(';')).join('\\r\\n')
    try {
      const salvato = await piattaforma.esportaCatalogo(csv, 'catalogo.csv')
      if (!salvato) return
      toast.success(\`Catalogo esportato (\${products.length} articoli)\`)
      await piattaforma.notifica(
        'Catalogo esportato',
        \`\${products.length} articoli salvati in formato CSV\`,
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">`,
  'handler di esportazione',
)
patch(
  'frontend/src/pages/AdminPage.tsx',
  `        <Button onClick={handleNew}>
          <Plus className="size-4" />
          Nuovo articolo
        </Button>`,
  `        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={products.length === 0}>
            <Download className="size-4" />
            Esporta catalogo
          </Button>
          <Button onClick={handleNew}>
            <Plus className="size-4" />
            Nuovo articolo
          </Button>
        </div>`,
  'pulsante "Esporta catalogo"',
)

// --------------------------------------------------------------------------- //
// 4. Guscio Electron                                                          //
// --------------------------------------------------------------------------- //

titolo('Guscio Electron in desktop/')

crea(
  'desktop/package.json',
  `{
  "name": "minicommerce-desktop",
  "version": "1.0.0",
  "private": true,
  "description": "Guscio Electron di minicommerce",
  "author": "ITS Frontend Development",
  "main": "dist/main.js",
  "scripts": {
    "build": "esbuild src/main.ts src/preload.ts --bundle --platform=node --format=cjs --external:electron --outdir=dist",
    "typecheck": "tsc --noEmit",
    "build:renderer": "npm --prefix ../frontend run build:desktop",
    "dev": "node scripts/dev.mjs",
    "start": "npm run build && npm run build:renderer && electron .",
    "package": "npm run build && npm run build:renderer && electron-builder --publish never"
  },
  "devDependencies": {}
}
`,
)

crea(
  'desktop/.gitignore',
  `dist/
release/
`,
)

crea(
  'desktop/tsconfig.json',
  `{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
`,
)

crea(
  'desktop/src/main.ts',
  `// Processo principale: il "server" dell'app desktop. Crea la finestra, gestisce il
// ciclo di vita, il tray e risponde alle richieste IPC del renderer.
// Qui dentro c'e' Node completo, nel renderer no: per questo il ponte passa dal preload.
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  type IpcMainInvokeEvent,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  shell,
  Tray,
} from 'electron'

/** In sviluppo lo passa scripts/dev.mjs dopo aver atteso il dev server di Vite */
const URL_DEV = process.env.VITE_DEV_SERVER_URL ?? ''
const LIMITE_CSV = 5 * 1024 * 1024
/** Senza il BOM Excel apre il CSV con gli accenti sbagliati */
const BOM = '\\ufeff'

let finestra: BrowserWindow | null = null
let tray: Tray | null = null

/** Icone: da pacchetto stanno in resources/, in sviluppo in desktop/build/ */
function percorsoRisorsa(nome: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, nome)
    : path.join(__dirname, '..', 'build', nome)
}

/** Renderer compilato: da pacchetto in resources/renderer, in sviluppo in frontend/dist */
function percorsoRenderer(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'renderer', 'index.html')
    : path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html')
}

function creaFinestra(): BrowserWindow {
  const nuova = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'MiniCommerce',
    backgroundColor: '#ffffff',
    icon: percorsoRisorsa('icon.png'),
    // Non si mostra subito: si evita il lampo di finestra bianca
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Le tre impostazioni non negoziabili: il renderer resta codice non fidato
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  nuova.once('ready-to-show', () => nuova.show())
  nuova.on('closed', () => {
    finestra = null
  })

  // I link esterni si aprono nel browser di sistema, non in una finestra Electron
  nuova.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (URL_DEV) {
    void nuova.loadURL(URL_DEV)
    nuova.webContents.openDevTools({ mode: 'detach' })
  } else {
    void nuova.loadFile(percorsoRenderer())
  }

  return nuova
}

function mostraFinestra(): void {
  if (!finestra || finestra.isDestroyed()) {
    finestra = creaFinestra()
    return
  }
  if (finestra.isMinimized()) finestra.restore()
  finestra.show()
  finestra.focus()
}

function creaTray(): void {
  const immagine = nativeImage.createFromPath(percorsoRisorsa('tray.png'))
  if (immagine.isEmpty()) return // senza un'icona valida il tray non va creato
  tray = new Tray(immagine.resize({ width: 16, height: 16 }))
  tray.setToolTip('MiniCommerce')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Apri', click: () => mostraFinestra() },
      { type: 'separator' },
      { label: 'Esci', click: () => app.quit() },
    ]),
  )
  tray.on('click', () => mostraFinestra())
}

// --- Validazione dei dati che arrivano dal renderer ------------------------ //

function testoValido(valore: unknown, massimo: number): string | null {
  if (typeof valore !== 'string' || valore.length > massimo) return null
  const pulito = valore.trim()
  return pulito.length > 0 ? pulito : null
}

/** Il nome file arriva dal renderer: via i separatori di percorso, estensione forzata */
function nomeFileCsv(valore: unknown): string {
  const grezzo = typeof valore === 'string' ? path.basename(valore) : ''
  const pulito = grezzo
    .replace(/[^\\w.\\- ]+/g, '_')
    .replace(/^[.\\s]+/, '')
    .trim()
  const nome = pulito.length > 0 ? pulito.slice(0, 80) : 'catalogo.csv'
  return nome.toLowerCase().endsWith('.csv') ? nome : \`\${nome}.csv\`
}

/** Accettiamo IPC solo dalla nostra finestra, non da frame o viste impreviste */
function finestraMittente(evento: IpcMainInvokeEvent): BrowserWindow | null {
  const origine = BrowserWindow.fromWebContents(evento.sender)
  return origine && origine === finestra ? origine : null
}

function registraIpc(): void {
  ipcMain.handle('minicommerce:notifica', (evento, dati: unknown) => {
    if (!finestraMittente(evento)) return
    const messaggio = dati as { titolo?: unknown; corpo?: unknown } | null
    const titolo = testoValido(messaggio?.titolo, 200)
    const corpo = testoValido(messaggio?.corpo, 2000)
    if (!titolo || !corpo || !Notification.isSupported()) return
    new Notification({ title: titolo, body: corpo }).show()
  })

  ipcMain.handle('minicommerce:esporta-catalogo', async (evento, dati: unknown) => {
    const origine = finestraMittente(evento)
    if (!origine) return false
    const messaggio = dati as { csv?: unknown; nomeFile?: unknown } | null
    const csv = testoValido(messaggio?.csv, LIMITE_CSV)
    if (!csv) return false

    const scelta = await dialog.showSaveDialog(origine, {
      title: 'Esporta catalogo',
      defaultPath: path.join(app.getPath('documents'), nomeFileCsv(messaggio?.nomeFile)),
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (scelta.canceled || !scelta.filePath) return false

    await writeFile(scelta.filePath, BOM + csv, 'utf8')
    return true
  })
}

// --- Ciclo di vita -------------------------------------------------------- //

if (!app.requestSingleInstanceLock()) {
  // Una seconda copia non apre una seconda app: cede il turno a quella gia' attiva
  app.quit()
} else {
  app.on('second-instance', () => mostraFinestra())

  void app.whenReady().then(() => {
    app.setAppUserModelId('it.its.minicommerce') // su Windows serve per le notifiche
    registraIpc()
    finestra = creaFinestra()
    creaTray()
    // macOS: click sull'icona nel dock con l'app viva ma senza finestre
    app.on('activate', () => mostraFinestra())
  })

  app.on('window-all-closed', () => {
    // Su Windows e Linux chiudere la finestra chiude l'app, su macOS no
    if (process.platform !== 'darwin') app.quit()
  })

  // Nessuna navigazione fuori dall'app: i link esterni passano da shell.openExternal
  app.on('web-contents-created', (_evento, contenuti) => {
    contenuti.on('will-navigate', (evento, url) => {
      const interno = URL_DEV ? url.startsWith(URL_DEV) : url.startsWith('file://')
      if (interno) return
      evento.preventDefault()
      if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url)
    })
  })
}
`,
)

crea(
  'desktop/src/preload.ts',
  `// Preload: l'unico punto di contatto tra renderer e processo principale.
// Gira in un contesto isolato e in sandbox: puo' usare solo ipcRenderer e contextBridge.
// Non esponiamo mai ipcRenderer direttamente, solo tre funzioni con una firma precisa.
import { contextBridge, ipcRenderer } from 'electron'

const ponte = {
  piattaforma: 'electron' as const,

  async notifica(titolo: string, corpo: string): Promise<void> {
    await ipcRenderer.invoke('minicommerce:notifica', { titolo, corpo })
  },

  /** false quando l'utente annulla la finestra di salvataggio */
  async esportaCatalogo(csv: string, nomeFile: string): Promise<boolean> {
    const salvato: unknown = await ipcRenderer.invoke('minicommerce:esporta-catalogo', {
      csv,
      nomeFile,
    })
    return salvato === true
  },
}

contextBridge.exposeInMainWorld('minicommerce', ponte)
`,
)

crea(
  'desktop/scripts/dev.mjs',
  `// Avvio in sviluppo: compila il guscio, accende il dev server di Vite, ASPETTA che
// risponda e solo allora lancia Electron. L'attesa e' una decina di righe di Node:
// niente wait-on ne' concurrently da installare.
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const GUSCIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FRONTEND = path.resolve(GUSCIO, '..', 'frontend')
// Indirizzo esplicito: "localhost" puo' risolvere su ::1 e finire su un altro server
const HOST = '127.0.0.1'
const PORTA = process.env.VITE_PORT ?? '5173'
const URL_DEV = process.env.VITE_DEV_SERVER_URL ?? \`http://\${HOST}:\${PORTA}\`
const SHELL = process.platform === 'win32'
const NPM = SHELL ? 'npm.cmd' : 'npm'

function esegui(comando) {
  console.log(\`> \${comando}\`)
  return spawnSync(comando, { cwd: GUSCIO, stdio: 'inherit', shell: true }).status ?? 1
}

function termina(processo) {
  if (!processo || processo.exitCode !== null) return
  if (SHELL) spawnSync('taskkill', ['/pid', String(processo.pid), '/t', '/f'], { stdio: 'ignore' })
  else processo.kill('SIGTERM')
}

/**
 * Aspetta il dev server. Non basta "qualcuno risponde": sulla stessa porta puo'
 * esserci un altro progetto, quindi controlliamo che la pagina sia la nostra.
 */
async function aspettaServer(url, tentativi = 60) {
  for (let i = 0; i < tentativi; i += 1) {
    try {
      const risposta = await fetch(url)
      if (risposta.ok && (await risposta.text()).includes('minicommerce')) return true
    } catch {
      // il dev server non e' ancora in ascolto: si riprova
    }
    await new Promise((risolvi) => setTimeout(risolvi, 500))
  }
  return false
}

const compilazione = esegui(\`\${NPM} run build\`)
if (compilazione !== 0) process.exit(compilazione)

const argomentiVite = ['run', 'dev:desktop', '--', '--host', HOST, '--port', PORTA]
console.log(\`> \${NPM} \${argomentiVite.join(' ')}   (in \${FRONTEND})\`)
const vite = spawn(\`\${NPM} \${argomentiVite.join(' ')}\`, { cwd: FRONTEND, stdio: 'inherit', shell: true })

console.log(\`      attendo \${URL_DEV} ...\`)
if (!(await aspettaServer(URL_DEV))) {
  console.error(\`
Il dev server di minicommerce non risponde su \${URL_DEV}.
Se la porta e' occupata da un altro progetto:  VITE_PORT=5180 npm run dev\`)
  termina(vite)
  process.exit(1)
}

const electron = createRequire(import.meta.url)('electron')
console.log(\`> electron .   (VITE_DEV_SERVER_URL=\${URL_DEV})\`)
const app = spawn(electron, ['.'], {
  cwd: GUSCIO,
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: URL_DEV },
})

app.on('exit', (codice) => {
  termina(vite)
  process.exit(codice ?? 0)
})
for (const segnale of ['SIGINT', 'SIGTERM']) {
  process.on(segnale, () => {
    termina(app)
    termina(vite)
    process.exit(0)
  })
}
`,
)

crea(
  'desktop/electron-builder.yml',
  `appId: it.its.minicommerce
productName: MiniCommerce
copyright: ITS Frontend Development

directories:
  output: release
  buildResources: build

# Nel pacchetto finisce solo il guscio compilato...
files:
  - dist/**/*
  - package.json

# ...il renderer e le icone arrivano come risorse esterne
extraResources:
  - from: ../frontend/dist
    to: renderer
  - from: build/tray.png
    to: tray.png
  - from: build/icon.png
    to: icon.png

win:
  target: nsis
  icon: build/icon.png

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true

linux:
  target:
    - AppImage
    - deb
  category: Utility
  icon: build/icon.png

mac:
  target: dmg
  category: public.app-category.business
  icon: build/icon.png
`,
)

// --------------------------------------------------------------------------- //
// 5. Icone                                                                    //
// --------------------------------------------------------------------------- //

titolo('Icone dell\'applicazione')

creaBinario('desktop/build/icon.png', pngIcona(256))
creaBinario('desktop/build/tray.png', pngIcona(32))

// --------------------------------------------------------------------------- //
// 6. Installazione delle dipendenze                                           //
// --------------------------------------------------------------------------- //

titolo('Installazione delle dipendenze')

if (SALTA_INSTALL) {
  info('--salta-install: npm install non eseguito')
} else {
  esegui(NPM, ['install'], assoluto('frontend'))

  const pacchettoDesktop = JSON.parse(leggi('desktop/package.json'))
  const dipendenze = pacchettoDesktop.devDependencies ?? {}
  if (dipendenze.electron) {
    // Le versioni sono gia' fissate in package.json/package-lock.json
    esegui(NPM, ['install'], assoluto('desktop'))
  } else {
    esegui(
      NPM,
      ['install', '--save-dev', 'electron', 'electron-builder', 'esbuild', 'typescript', '@types/node'],
      assoluto('desktop'),
    )
  }
}

// --------------------------------------------------------------------------- //
// 7. Compilazione                                                             //
// --------------------------------------------------------------------------- //

titolo('Compilazione del guscio e del renderer')

if (SALTA_BUILD) {
  info('--salta-build: nessuna compilazione')
} else {
  // esbuild: main.ts e preload.ts diventano CommonJS in desktop/dist
  esegui(NPM, ['run', 'build'], assoluto('desktop'))
  // tsc -b + vite build --mode desktop: il renderer in frontend/dist
  esegui(NPM, ['run', 'build:desktop'], assoluto('frontend'))
}

// --------------------------------------------------------------------------- //
// Riepilogo                                                                   //
// --------------------------------------------------------------------------- //

console.log(`
=============================================================================
 minicommerce desktop (Electron) pronto.
=============================================================================

 File creati:     ${creati.length ? creati.join(', ') : 'nessuno (erano gia\' presenti)'}
 File modificati: ${modificati.length ? modificati.join(', ') : 'nessuno (patch gia\' applicate)'}

 COME SI AVVIA

 1) il backend, come sempre (serve anche al desktop):
      cd backend && npm run dev

 2) l'app desktop in sviluppo (Vite + Electron, con ricarica a caldo):
      cd desktop && npm run dev

 3) l'app desktop sui file compilati, come in produzione:
      cd desktop && npm start

 4) il pacchetto installabile per questo sistema operativo:
      cd desktop && npm run package      ->  desktop/release/

 L'app web non e' cambiata:  cd frontend && npm run dev

 Dettagli e problemi noti: docs/DESKTOP-ELECTRON.md
`)

// --------------------------------------------------------------------------- //
// Generatore di icone PNG                                                     //
//                                                                             //
// Un PNG RGBA scritto a mano (zlib e' un modulo node:), per non dover tenere  //
// immagini binarie nel repository ne' dipendere da tool esterni.              //
// --------------------------------------------------------------------------- //

function pngIcona(lato) {
  const righe = []
  for (let y = 0; y < lato; y += 1) {
    const riga = Buffer.alloc(lato * 4 + 1) // primo byte: filtro PNG (0 = nessuno)
    for (let x = 0; x < lato; x += 1) {
      const [r, g, b, a] = pixelIcona((x + 0.5) / lato, (y + 0.5) / lato)
      riga[1 + x * 4] = r
      riga[2 + x * 4] = g
      riga[3 + x * 4] = b
      riga[4 + x * 4] = a
    }
    righe.push(riga)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(lato, 0)
  ihdr.writeUInt32BE(lato, 4)
  ihdr[8] = 8 // 8 bit per canale
  ihdr[9] = 6 // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloccoPng('IHDR', ihdr),
    bloccoPng('IDAT', zlib.deflateSync(Buffer.concat(righe))),
    bloccoPng('IEND', Buffer.alloc(0)),
  ])
}

/** Quadrato con angoli arrotondati indaco e una "M" bianca */
function pixelIcona(u, v) {
  const dentro = distanzaQuadratoArrotondato(u, v, 0.04, 0.16)
  if (dentro > 0) return [0, 0, 0, 0]
  const emme = Math.min(
    distanzaSegmento(u, v, 0.3, 0.7, 0.3, 0.3),
    distanzaSegmento(u, v, 0.3, 0.3, 0.5, 0.6),
    distanzaSegmento(u, v, 0.5, 0.6, 0.7, 0.3),
    distanzaSegmento(u, v, 0.7, 0.3, 0.7, 0.7),
  )
  return emme < 0.035 ? [255, 255, 255, 255] : [79, 70, 229, 255]
}

function distanzaQuadratoArrotondato(u, v, margine, raggio) {
  const dx = Math.abs(u - 0.5) - (0.5 - margine - raggio)
  const dy = Math.abs(v - 0.5) - (0.5 - margine - raggio)
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - raggio
}

function distanzaSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

function bloccoPng(tipo, dati) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati])
  const blocco = Buffer.alloc(corpo.length + 8)
  blocco.writeUInt32BE(dati.length, 0)
  corpo.copy(blocco, 4)
  blocco.writeUInt32BE(crc32(corpo), corpo.length + 4)
  return blocco
}

function crc32(dati) {
  let crc = 0xffffffff
  for (const byte of dati) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
