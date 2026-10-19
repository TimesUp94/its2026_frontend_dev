// Processo principale: il "server" dell'app desktop. Crea la finestra, gestisce il
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
const BOM = '\ufeff'

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
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/^[.\s]+/, '')
    .trim()
  const nome = pulito.length > 0 ? pulito.slice(0, 80) : 'catalogo.csv'
  return nome.toLowerCase().endsWith('.csv') ? nome : `${nome}.csv`
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
