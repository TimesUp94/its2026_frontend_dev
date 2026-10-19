#!/usr/bin/env node
// -----------------------------------------------------------------------------
// minicommerce - da applicazione web a applicazione desktop con Tauri 2
//
// Uso:   node scripts/setup-tauri.mjs [--con-cargo-check]
//
// Lo script esegue, nell'ordine, tutti i comandi spiegati a lezione e applica
// le patch al frontend. E' idempotente: se una modifica c'e' gia' la salta.
// Usa solo moduli nativi di Node (nessuna dipendenza esterna).
// -----------------------------------------------------------------------------

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FRONTEND = path.join(RADICE, 'frontend')
const SRC_TAURI = path.join(FRONTEND, 'src-tauri')
const CON_CARGO_CHECK = process.argv.includes('--con-cargo-check')

class ErroreSetup extends Error {}

// --- piccola libreria di output ----------------------------------------------

let numeroPasso = 0

function passo(titolo) {
  numeroPasso += 1
  console.log(`\n=== Passo ${numeroPasso}: ${titolo} ===`)
}

const ok = (testo) => console.log(`  [ok] ${testo}`)
const nota = (testo) => console.log(`  [--] ${testo}`)
const avviso = (testo) => console.log(`  [!!] ${testo}`)

/** Esegue un comando esterno stampandolo prima, come nelle slide. */
function esegui(comando, { cwd = FRONTEND, tolleranteAgliErrori = false } = {}) {
  console.log(`\n> ${comando}`)
  const esito = spawnSync(comando, { cwd, stdio: 'inherit', shell: true })
  if (esito.status !== 0) {
    if (tolleranteAgliErrori) return false
    throw new ErroreSetup(`il comando e' terminato con codice ${esito.status}: ${comando}`)
  }
  return true
}

function esisteComando(comando) {
  const esito = spawnSync(`${comando} --version`, { stdio: 'ignore', shell: true })
  return esito.status === 0
}

// --- piccola libreria di modifiche ai file ------------------------------------

function leggi(percorsoAssoluto) {
  if (!fs.existsSync(percorsoAssoluto)) {
    throw new ErroreSetup(`file non trovato: ${percorsoAssoluto}`)
  }
  return fs.readFileSync(percorsoAssoluto, 'utf8')
}

// Su Windows il repository viene estratto con fine riga CRLF (core.autocrlf):
// le patch vanno confrontate e scritte con il fine riga del file, altrimenti il
// testo atteso non si trova mai e i file diventano misti.
const aLf = (testo) => testo.replace(/\r\n/g, '\n')
const conEol = (testo, eol) => (eol === '\r\n' ? aLf(testo).replace(/\n/g, '\r\n') : aLf(testo))
const eolDi = (testo) => (testo.includes('\r\n') ? '\r\n' : '\n')

/** Fine riga usato nella copia di lavoro, letto da un file che esiste sempre. */
const EOL_PROGETTO = eolDi(leggi(path.join(FRONTEND, 'package.json')))

/**
 * Applica sostituzioni testuali mirate a un file esistente.
 * - se nel file c'e' gia' `marcatore`, la patch e' considerata fatta e si salta;
 * - se il testo da sostituire non c'e' (o compare piu' volte) si interrompe tutto:
 *   meglio un errore chiaro che una modifica a caso.
 */
function patcha(percorsoRelativo, marcatore, sostituzioni) {
  const percorso = path.join(RADICE, percorsoRelativo)
  const originale = leggi(percorso)
  const eol = eolDi(originale)
  let testo = aLf(originale)
  if (testo.includes(marcatore)) {
    nota(`${percorsoRelativo}: patch gia' presente, salto`)
    return false
  }
  for (const [daCercare, daScrivere] of sostituzioni) {
    const occorrenze = testo.split(daCercare).length - 1
    if (occorrenze === 0) {
      throw new ErroreSetup(
        `in ${percorsoRelativo} non trovo il testo atteso:\n----\n${daCercare}\n----\n` +
          `Il file e' stato modificato rispetto a master: applica la patch a mano.`,
      )
    }
    if (occorrenze > 1) {
      throw new ErroreSetup(
        `in ${percorsoRelativo} il testo atteso compare ${occorrenze} volte, ` +
          `la sostituzione sarebbe ambigua:\n----\n${daCercare}\n----`,
      )
    }
    testo = testo.replace(daCercare, daScrivere)
  }
  fs.writeFileSync(percorso, conEol(testo, eol))
  ok(`${percorsoRelativo} aggiornato`)
  return true
}

/** Scrive un file (creando le cartelle) solo se manca o se e' cambiato. */
function scrivi(percorsoRelativo, contenuto) {
  const percorso = path.join(RADICE, percorsoRelativo)
  const atteso = conEol(contenuto, EOL_PROGETTO)
  if (fs.existsSync(percorso) && fs.readFileSync(percorso, 'utf8') === atteso) {
    nota(`${percorsoRelativo}: gia' aggiornato, salto`)
    return false
  }
  fs.mkdirSync(path.dirname(percorso), { recursive: true })
  fs.writeFileSync(percorso, atteso)
  ok(`${percorsoRelativo} scritto`)
  return true
}

function leggiJson(percorsoRelativo) {
  return JSON.parse(leggi(path.join(RADICE, percorsoRelativo)))
}

function scriviJson(percorsoRelativo, oggetto) {
  return scrivi(percorsoRelativo, `${JSON.stringify(oggetto, null, 2)}\n`)
}

// -----------------------------------------------------------------------------
// Contenuti dei file nuovi
// -----------------------------------------------------------------------------

const ENV_DESKTOP = `# Caricato da Vite solo con --mode desktop (npm run build:desktop).
# In sviluppo (npm run dev) restano i valori web: BrowserRouter + proxy /api.

# Nel pacchetto non c'e' un server che riscriva le rotte: serve HashRouter.
VITE_ROUTER=hash
# Nel pacchetto desktop il proxy di Vite non esiste: serve l'URL assoluto del backend.
VITE_API_URL=http://localhost:3001/api
# Percorsi degli asset relativi (vedi vite.config.ts).
VITE_DESKTOP=1
`

const PIATTAFORMA_TS = `import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

/**
 * Ponte fra l'app React e il sistema operativo.
 *
 * Le pagine non sanno dove stanno girando: chiedono \`usaPiattaforma()\` e usano
 * sempre la stessa interfaccia. L'implementazione web resta il fallback e deve
 * funzionare nel browser; quella tauri usa i plugin dialog/fs/notification.
 */
export type NomePiattaforma = 'web' | 'electron' | 'tauri'

export interface Piattaforma {
  nome: NomePiattaforma
  notifica(titolo: string, corpo: string): Promise<void>
  /** Ritorna false se l'utente ha annullato il salvataggio. */
  esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
}

const piattaformaWeb: Piattaforma = {
  nome: 'web',
  async notifica(titolo, corpo) {
    if (!('Notification' in window)) return
    let permesso = Notification.permission
    if (permesso === 'default') permesso = await Notification.requestPermission()
    if (permesso === 'granted') new Notification(titolo, { body: corpo })
  },
  async esportaCatalogo(csv, nomeFile) {
    // Nel browser non si puo' scegliere la cartella: si scarica e basta.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nomeFile
    link.click()
    URL.revokeObjectURL(url)
    return true
  },
}

const piattaformaTauri: Piattaforma = {
  nome: 'tauri',
  async notifica(titolo, corpo) {
    let concesso = await isPermissionGranted()
    if (!concesso) concesso = (await requestPermission()) === 'granted'
    if (concesso) sendNotification({ title: titolo, body: corpo })
  },
  async esportaCatalogo(csv, nomeFile) {
    const percorso = await save({
      defaultPath: nomeFile,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (!percorso) return false
    // Il file scelto nel dialogo viene aggiunto allo scope del plugin fs:
    // senza il dialogo questa scrittura verrebbe rifiutata.
    await writeTextFile(percorso, csv)
    return true
  },
}

export function usaPiattaforma(): Piattaforma {
  return isTauri() ? piattaformaTauri : piattaformaWeb
}
`

const COMANDI_TAURI_TS = `import { invoke, isTauri } from '@tauri-apps/api/core'

/**
 * Esempio di comando Rust chiamato dal frontend.
 *
 * Lato Rust (frontend/src-tauri/src/lib.rs):
 *   #[tauri::command]
 *   fn conta_esauriti(scorte: Vec<i64>) -> usize
 *
 * Nel browser il comando non esiste, quindi si calcola lo stesso valore in JS:
 * serve a far vedere che il confine fra web e desktop e' una funzione sola.
 */
export async function contaEsauriti(scorte: number[]): Promise<number> {
  if (!isTauri()) return scorte.filter((scorta) => scorta <= 0).length
  return await invoke<number>('conta_esauriti', { scorte })
}
`

const CAPABILITIES_DEFAULT = {
  $schema: '../gen/schemas/desktop-schema.json',
  identifier: 'default',
  description:
    "Permessi minimi di minicommerce: finestra principale, salvataggio CSV e notifiche. Quello che non e' elencato qui non e' richiamabile dal frontend.",
  windows: ['main'],
  permissions: [
    'core:default',
    'dialog:allow-save',
    'fs:allow-write-text-file',
    'notification:allow-is-permission-granted',
    'notification:allow-request-permission',
    'notification:allow-notify',
  ],
}

const COMANDO_RUST = `/// Comando richiamabile dal frontend con
/// \`invoke('conta_esauriti', { scorte: [3, 0, 7] })\`.
/// Conta gli articoli con scorta a zero: e' l'esempio minimo di codice Rust
/// che il frontend puo' chiamare attraverso il canale IPC di Tauri.
#[tauri::command]
fn conta_esauriti(scorte: Vec<i64>) -> usize {
    scorte.iter().filter(|scorta| **scorta <= 0).count()
}

`

const CSP =
  "default-src 'self'; " +
  // Le immagini degli articoli sono data URL salvate nel database.
  "img-src 'self' data:; " +
  // Tailwind e i componenti shadcn usano stili inline.
  "style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; " +
  // ipc: serve a invoke(), localhost:3001 e' il backend Express.
  "connect-src 'self' ipc: http://ipc.localhost http://localhost:3001"

// -----------------------------------------------------------------------------
// I passi
// -----------------------------------------------------------------------------

function passoPrerequisiti() {
  passo('Controllo dei prerequisiti')
  if (!fs.existsSync(path.join(FRONTEND, 'package.json'))) {
    throw new ErroreSetup(`non trovo frontend/package.json dentro ${RADICE}`)
  }
  for (const comando of ['node', 'npm', 'cargo', 'rustc']) {
    if (!esisteComando(comando)) {
      throw new ErroreSetup(
        `${comando} non e' installato o non e' nel PATH. ` +
          `Tauri ha bisogno di Node 20+ e della toolchain Rust (https://rustup.rs).`,
      )
    }
    ok(`${comando} presente`)
  }
  if (process.platform === 'win32') {
    nota('su Windows serve anche WebView2, incluso in Windows 10/11 aggiornati')
  }
}

function passoInstallFrontend() {
  passo('Dipendenze del frontend web')
  esegui('npm install')
}

function passoPatchCondivise() {
  passo('Le tre patch al frontend (router, baseURL, base degli asset)')

  patcha('frontend/src/main.tsx', 'const Router =', [
    [
      "import { BrowserRouter } from 'react-router-dom'",
      "import { BrowserRouter, HashRouter } from 'react-router-dom'",
    ],
    [
      "createRoot(document.getElementById('root')!).render(",
      '// Prima sorpresa: nel pacchetto desktop la pagina non arriva da un web server\n' +
        '// che riscriva le rotte (protocollo interno di Tauri, oppure file://), quindi un\n' +
        '// reload su /admin non troverebbe nulla. La build desktop imposta VITE_ROUTER=hash.\n' +
        "const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter\n" +
        '\n' +
        "createRoot(document.getElementById('root')!).render(",
    ],
    ['    <BrowserRouter>', '    <Router>'],
    ['    </BrowserRouter>', '    </Router>'],
  ])

  patcha('frontend/src/lib/api.ts', 'VITE_API_URL', [
    [
      "export const api = axios.create({ baseURL: '/api' })",
      '// Seconda sorpresa: nel pacchetto desktop il proxy di Vite non esiste, quindi\n' +
        "// serve l'URL assoluto del backend. Sul web la variabile non c'e' e resta '/api'.\n" +
        "export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })",
    ],
  ])

  patcha('frontend/vite.config.ts', 'VITE_DESKTOP', [
    [
      'export default defineConfig({\n  plugins: [react(), tailwindcss()],',
      'export default defineConfig(({ mode }) => ({\n' +
        "  // Terza sorpresa: nel pacchetto desktop l'index.html non e' servito dalla radice\n" +
        '  // di un web server, quindi i percorsi degli asset devono essere relativi: cosi\n' +
        "  // funzionano anche aprendo il file da file://. Sul web resta '/'.\n" +
        "  base: mode === 'desktop' || process.env.VITE_DESKTOP === '1' ? './' : '/',\n" +
        '  plugins: [react(), tailwindcss()],',
    ],
    [
      "  server: {\n    proxy: {\n      '/api': 'http://localhost:3001',\n    },\n  },\n})",
      '  server: {\n' +
        '    // tauri dev apre http://localhost:5173: se Vite cambiasse porta la finestra resterebbe bianca.\n' +
        '    strictPort: true,\n' +
        '    watch: {\n' +
        '      // Durante la compilazione Rust src-tauri/target cambia di continuo e il\n' +
        '      // watcher di Vite si ferma con EBUSY: va escluso.\n' +
        "      ignored: ['**/src-tauri/**'],\n" +
        '    },\n' +
        "    proxy: {\n      '/api': 'http://localhost:3001',\n    },\n  },\n}))",
    ],
  ])

  scrivi('frontend/.env.desktop', ENV_DESKTOP)
}

function passoAstrazionePiattaforma() {
  passo('Astrazione di piattaforma e pulsante "Esporta catalogo"')
  scrivi('frontend/src/lib/piattaforma.ts', PIATTAFORMA_TS)
  scrivi('frontend/src/lib/comandi-tauri.ts', COMANDI_TAURI_TS)

  patcha('frontend/src/pages/AdminPage.tsx', 'Esporta catalogo', [
    [
      "import { Pencil, Plus, Trash2 } from 'lucide-react'",
      "import { Download, Pencil, Plus, Trash2 } from 'lucide-react'",
    ],
    [
      "import { useAuth } from '@/lib/auth'",
      "import { useAuth } from '@/lib/auth'\n" +
        "import { contaEsauriti } from '@/lib/comandi-tauri'\n" +
        "import { usaPiattaforma } from '@/lib/piattaforma'",
    ],
    [
      'export function AdminPage() {',
      '/** Un campo CSV va protetto se contiene il separatore, le virgolette o un newline. */\n' +
        'function campoCsv(valore: string | number): string {\n' +
        '  const testo = String(valore)\n' +
        '  return /[";\\r\\n]/.test(testo) ? `"${testo.replaceAll(\'"\', \'""\')}"` : testo\n' +
        '}\n' +
        '\n' +
        'export function AdminPage() {',
    ],
    [
      '  const [editing, setEditing] = useState<Product | null>(null)',
      '  const [editing, setEditing] = useState<Product | null>(null)\n' +
        '  const piattaforma = usaPiattaforma()',
    ],
    [
      '  return (\n    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">',
      '  const handleEsporta = async () => {\n' +
        '    if (products.length === 0) {\n' +
        "      toast.error('Nessun articolo da esportare')\n" +
        '      return\n' +
        '    }\n' +
        "    const intestazione = ['id', 'nome', 'categoria', 'marca', 'prezzo', 'disponibilita']\n" +
        '    const righe = products.map((product) => [\n' +
        '      product.id,\n' +
        '      product.name,\n' +
        '      product.category,\n' +
        '      product.brand,\n' +
        '      product.price,\n' +
        '      product.stock,\n' +
        '    ])\n' +
        '    const csv = [intestazione, ...righe]\n' +
        "      .map((riga) => riga.map(campoCsv).join(';'))\n" +
        "      .join('\\r\\n')\n" +
        '    try {\n' +
        "      // conta_esauriti e' un comando Rust: in desktop il conteggio arriva da Tauri.\n" +
        '      const esauriti = await contaEsauriti(products.map((product) => product.stock))\n' +
        "      const salvato = await piattaforma.esportaCatalogo(csv, 'catalogo.csv')\n" +
        '      if (!salvato) {\n' +
        "        toast.info('Esportazione annullata')\n" +
        '        return\n' +
        '      }\n' +
        '      toast.success(`Catalogo esportato: ${products.length} articoli, ${esauriti} esauriti`)\n' +
        "      await piattaforma.notifica('minicommerce', `Catalogo esportato (${products.length} articoli)`)\n" +
        '    } catch (err) {\n' +
        '      toast.error(getErrorMessage(err))\n' +
        '    }\n' +
        '  }\n' +
        '\n' +
        '  return (\n    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">',
    ],
    [
      '        <Button onClick={handleNew}>\n' +
        '          <Plus className="size-4" />\n' +
        '          Nuovo articolo\n' +
        '        </Button>',
      '        <div className="flex gap-2">\n' +
        '          <Button variant="outline" onClick={handleEsporta}>\n' +
        '            <Download className="size-4" />\n' +
        '            Esporta catalogo\n' +
        '          </Button>\n' +
        '          <Button onClick={handleNew}>\n' +
        '            <Plus className="size-4" />\n' +
        '            Nuovo articolo\n' +
        '          </Button>\n' +
        '        </div>',
    ],
  ])
}

function passoDipendenzeTauri() {
  passo('Dipendenze npm di Tauri')
  const pkg = leggiJson('frontend/package.json')
  if (pkg.devDependencies?.['@tauri-apps/cli']) {
    nota('@tauri-apps/cli gia presente, salto')
  } else {
    esegui('npm install -D "@tauri-apps/cli@^2"')
  }
  if (pkg.dependencies?.['@tauri-apps/api']) {
    nota('@tauri-apps/api gia presente, salto')
  } else {
    esegui('npm install "@tauri-apps/api@^2"')
  }
}

function passoScriptNpm() {
  passo('Script npm per il desktop')
  const pkg = leggiJson('frontend/package.json')
  const attesi = {
    tauri: 'tauri',
    'build:desktop': 'tsc -b && vite build --mode desktop',
    'desktop:dev': 'tauri dev',
    'desktop:build': 'tauri build',
  }
  let modificato = false
  for (const [nome, comando] of Object.entries(attesi)) {
    if (pkg.scripts[nome] === comando) continue
    pkg.scripts[nome] = comando
    modificato = true
  }
  if (!modificato) {
    nota('script npm gia presenti, salto')
    return
  }
  scriviJson('frontend/package.json', pkg)
}

function passoGuscioTauri() {
  passo('Guscio nativo: tauri init')
  if (fs.existsSync(path.join(SRC_TAURI, 'tauri.conf.json'))) {
    nota('frontend/src-tauri/ esiste gia, salto tauri init')
  } else {
    esegui(
      'npx tauri init --ci --app-name minicommerce --window-title minicommerce ' +
        '--frontend-dist ../dist --dev-url http://localhost:5173 ' +
        '--before-dev-command "npm run dev" --before-build-command "npm run build:desktop"',
    )
  }
  // Il crate si chiama "app": rinominarlo subito, prima che `tauri add` scriva
  // Cargo.lock, evita di lasciare nel lock un pacchetto che non esiste piu'.
  patcha('frontend/src-tauri/Cargo.toml', 'name = "minicommerce"', [
    ['name = "app"', 'name = "minicommerce"'],
    ['description = "A Tauri App"', 'description = "minicommerce desktop (Tauri 2)"'],
  ])
}

function passoPluginTauri() {
  passo('Plugin Tauri (crate Rust + pacchetto npm + permesso con un comando)')
  for (const plugin of ['dialog', 'fs', 'notification']) {
    const cargo = leggi(path.join(SRC_TAURI, 'Cargo.toml'))
    if (cargo.includes(`tauri-plugin-${plugin} =`)) {
      nota(`plugin ${plugin} gia presente, salto`)
      continue
    }
    // `tauri add` non e' interattivo: aggiunge il crate Rust, il pacchetto npm,
    // la riga .plugin(...) in lib.rs e il permesso nelle capabilities.
    esegui(`npx tauri add ${plugin}`)
  }
}

function passoConfigurazione() {
  passo('Configurazione di Tauri (identifier, finestra, CSP, permessi, comando Rust)')

  const conf = leggiJson('frontend/src-tauri/tauri.conf.json')
  conf.productName = 'minicommerce'
  conf.identifier = 'it.its.minicommerce'
  conf.build = {
    ...conf.build,
    frontendDist: '../dist',
    devUrl: 'http://localhost:5173',
    beforeDevCommand: 'npm run dev',
    beforeBuildCommand: 'npm run build:desktop',
  }
  conf.app.windows = [
    {
      title: 'minicommerce',
      width: 1280,
      height: 800,
      resizable: true,
      fullscreen: false,
    },
  ]
  conf.app.security = { ...conf.app.security, csp: CSP }
  scriviJson('frontend/src-tauri/tauri.conf.json', conf)

  // Solo i permessi che l'app usa davvero: in Tauri cio' che non e' elencato non si puo' fare.
  scriviJson('frontend/src-tauri/capabilities/default.json', CAPABILITIES_DEFAULT)

  patcha('frontend/src-tauri/src/lib.rs', 'conta_esauriti', [
    [
      '#[cfg_attr(mobile, tauri::mobile_entry_point)]',
      `${COMANDO_RUST}#[cfg_attr(mobile, tauri::mobile_entry_point)]`,
    ],
    [
      '    tauri::Builder::default()',
      '    tauri::Builder::default()\n' +
        '        .invoke_handler(tauri::generate_handler![conta_esauriti])',
    ],
  ])
}

function passoIcone() {
  passo('Icone dal materiale del progetto')
  const timbro = path.join(SRC_TAURI, 'icons', 'SORGENTE.txt')
  if (fs.existsSync(timbro)) {
    nota('icone gia generate, salto')
    return
  }
  // hero.png non e' quadrata: --fit contain la centra su una tela trasparente.
  const riuscito = esegui('npx tauri icon src/assets/hero.png --fit contain', {
    tolleranteAgliErrori: true,
  })
  if (!riuscito) {
    avviso(
      'generazione icone fallita: restano le icone di default create da tauri init ' +
        '(set valido ma generico).',
    )
    return
  }
  // L'app e' solo desktop: le icone per mobile generate dalla CLI non servono.
  for (const cartella of ['android', 'ios']) {
    fs.rmSync(path.join(SRC_TAURI, 'icons', cartella), { recursive: true, force: true })
  }
  scrivi(
    'frontend/src-tauri/icons/SORGENTE.txt',
    'Icone generate da frontend/src/assets/hero.png con:\n' +
      '  npx tauri icon src/assets/hero.png --fit contain\n' +
      '(eseguito dentro frontend/). Le cartelle android/ e ios/ sono state rimosse.\n',
  )
}

function passoDocumentazione() {
  passo('Documentazione')
  scrivi('docs/DESKTOP-TAURI.md', DOC_TAURI)
}

function passoVerifica() {
  passo('Verifica')
  esegui('npm run build:desktop')
  if (CON_CARGO_CHECK) {
    esegui('cargo check', { cwd: SRC_TAURI })
  } else {
    nota('cargo check non eseguito (rilancia con --con-cargo-check per includerlo)')
  }
}

// -----------------------------------------------------------------------------
// Documentazione generata
// -----------------------------------------------------------------------------

const DOC_TAURI = `# minicommerce desktop con Tauri 2

## A cosa serve

Lo stesso frontend React del corso, impacchettato come applicazione desktop con
[Tauri 2](https://v2.tauri.app). La finestra non e' un browser Chromium incluso
nel pacchetto: Tauri usa la WebView del sistema operativo (WebView2 su Windows,
WebKit su macOS e Linux) e tiene il codice nativo in un binario Rust. Il backend
Express resta un processo separato su \`http://localhost:3001\`.

Tutta la trasformazione da master a questa versione sta in un unico script:
\`scripts/setup-tauri.mjs\`.

## Prerequisiti

- Node.js 24 (verificato con 24.19) e npm 11.
- Toolchain Rust stabile, installata con [rustup](https://rustup.rs)
  (verificato con cargo/rustc 1.99). Su Windows serve anche il linker MSVC
  (Visual Studio Build Tools con "Desktop development with C++").
- **Windows:** WebView2, gia' presente su Windows 10/11 aggiornati. Se manca,
  l'applicazione non apre la finestra: si installa da Microsoft Evergreen Runtime.
- Il backend del progetto in esecuzione (\`cd backend && npm run dev\`) se si
  vogliono vedere i dati.

## Trasformazione con un comando

Da un clone pulito di master, nella radice del repository:

\`\`\`
git checkout master
git checkout desktop/tauri -- scripts/setup-tauri.mjs   # lo script vive su questo branch
node scripts/setup-tauri.mjs
\`\`\`

Lo script stampa ogni comando che esegue e si puo' rilanciare quante volte si
vuole: se una patch c'e' gia' la salta, non la duplica. Con
\`node scripts/setup-tauri.mjs --con-cargo-check\` esegue anche \`cargo check\`
alla fine (la prima volta scarica e compila le dipendenze Rust: diversi minuti).

Cosa fa, nell'ordine: controlla i prerequisiti, \`npm install\` nel frontend,
applica le tre patch condivise, crea l'astrazione di piattaforma e il pulsante
di esportazione, installa \`@tauri-apps/cli\` e \`@tauri-apps/api\`, aggiunge gli
script npm, lancia \`tauri init\`, aggiunge i plugin con \`tauri add\`, scrive la
configurazione e i permessi, genera le icone e infine fa la build del frontend.

## Sviluppo

\`\`\`
cd backend && npm run dev          # in un terminale: API su :3001
cd frontend && npm run desktop:dev # in un altro: Vite su :5173 + finestra Tauri
\`\`\`

\`desktop:dev\` e' \`tauri dev\`: fa partire Vite con \`beforeDevCommand\` e apre la
finestra su \`http://localhost:5173\`. In sviluppo l'app resta identica alla
versione web (BrowserRouter, chiamate a \`/api\` girate dal proxy di Vite); la
prima compilazione Rust richiede diversi minuti, le successive sono veloci.

## Pacchetto

\`\`\`
cd frontend
npm run desktop:build          # tauri build: installer in release
npx tauri build --debug        # build piu' rapida, senza ottimizzazioni
\`\`\`

\`tauri build\` lancia \`beforeBuildCommand\` (\`npm run build:desktop\`, cioe'
\`tsc -b && vite build --mode desktop\`) e poi compila il binario Rust che si
porta dentro \`frontend/dist\`. I risultati finiscono in
\`frontend/src-tauri/target/{debug,release}/\` e gli installer in
\`.../bundle/\`.

## Cosa e' stato modificato nel frontend, e perche'

| File | Modifica | Perche' |
| --- | --- | --- |
| \`src/main.tsx\` | \`const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter\` | Nel pacchetto la pagina arriva dal protocollo interno di Tauri (o da \`file://\`) e non c'e' un server che riscriva le rotte: con BrowserRouter un reload su \`/admin\` non troverebbe nulla. Sul web il valore non e' impostato e resta BrowserRouter. |
| \`src/lib/api.ts\` | \`baseURL: import.meta.env.VITE_API_URL ?? '/api'\` | Il proxy di Vite esiste solo in sviluppo: nel pacchetto serve l'URL assoluto \`http://localhost:3001/api\`. Il default lascia il comportamento web invariato. |
| \`vite.config.ts\` | \`base\` condizionale (\`'./'\` con \`--mode desktop\` o \`VITE_DESKTOP=1\`), \`server.strictPort\` e \`server.watch.ignored\` | Con \`base: '/'\` l'index.html del pacchetto cercherebbe \`/assets/...\` nella radice e resterebbe bianco. \`strictPort\` evita che Vite si sposti su un'altra porta mentre \`devUrl\` punta alla 5173. Senza escludere \`**/src-tauri/**\` dal watcher, \`tauri dev\` muore con \`EBUSY ... target\\debug\\deps\\*.dll\` mentre cargo compila. |
| \`.env.desktop\` (nuovo) | \`VITE_ROUTER\`, \`VITE_API_URL\`, \`VITE_DESKTOP\` | Caricato solo da \`vite build --mode desktop\`: la build web non cambia. |
| \`src/lib/piattaforma.ts\` (nuovo) | \`usaPiattaforma()\` con implementazione \`web\` e \`tauri\` | Le pagine non sanno dove girano: stessa interfaccia per notifiche ed esportazione. |
| \`src/lib/comandi-tauri.ts\` (nuovo) | \`contaEsauriti()\` | Chiama il comando Rust \`conta_esauriti\` con \`invoke\`, con lo stesso calcolo in JS come fallback web. |
| \`src/pages/AdminPage.tsx\` | pulsante "Esporta catalogo" | Funzionalita' visibile che attraversa il ponte: genera il CSV e lo passa a \`esportaCatalogo()\`. |
| \`package.json\` | script \`tauri\`, \`build:desktop\`, \`desktop:dev\`, \`desktop:build\` | Comandi di lezione sempre a portata di mano. |

Il pulsante funziona anche nel browser: lì l'implementazione \`web\` scarica il
file con un \`<a download>\` su un Blob e usa le Notification del browser.
Nella finestra Tauri passa invece dal dialogo nativo di salvataggio
(\`@tauri-apps/plugin-dialog\`) e scrive il file con
\`@tauri-apps/plugin-fs\`.

## Il guscio nativo

\`\`\`
frontend/src-tauri/
  Cargo.toml                  crate "minicommerce" + plugin dialog/fs/notification
  tauri.conf.json             identifier it.its.minicommerce, finestra 1280x800, CSP
  capabilities/default.json   i permessi concessi alla finestra "main"
  src/main.rs                 entry point, chiama app_lib::run()
  src/lib.rs                  Builder, plugin e il comando conta_esauriti
  icons/                      generate da src/assets/hero.png
\`\`\`

### Permessi

In Tauri quello che non e' elencato nelle capabilities non e' richiamabile dal
frontend, anche se il plugin e' compilato dentro. \`tauri add\` aggiunge i set
\`<plugin>:default\`, che sono piu' larghi del necessario; qui la lista e' stata
ridotta a mano a:

\`\`\`
core:default
dialog:allow-save
fs:allow-write-text-file
notification:allow-is-permission-granted
notification:allow-request-permission
notification:allow-notify
\`\`\`

Il plugin fs di per se' non apre tutto il disco: la scrittura passa perche' il
comando \`save\` del plugin dialog aggiunge il file scelto dall'utente allo scope
di fs (si vede in \`tauri-plugin-dialog\`, \`commands.rs\`, \`scope.allow_file()\`).
I nomi dei permessi vengono validati in compilazione da \`tauri-build\`: se se ne
scrive uno sbagliato, \`cargo check\` fallisce. Togliere una riga da questo elenco
e rilanciare l'app e' la dimostrazione da fare a lezione.

### Comando Rust

\`\`\`rust
#[tauri::command]
fn conta_esauriti(scorte: Vec<i64>) -> usize {
    scorte.iter().filter(|scorta| **scorta <= 0).count()
}
\`\`\`

Registrato con \`.invoke_handler(tauri::generate_handler![conta_esauriti])\` e
chiamato dal frontend con
\`invoke('conta_esauriti', { scorte })\` dentro \`src/lib/comandi-tauri.ts\`.
Il risultato finisce nel messaggio del toast dopo l'esportazione.

### CSP

\`app.security.csp\` permette \`data:\` per le immagini (gli articoli hanno
l'immagine come data URL), gli stili inline di Tailwind/shadcn, \`ipc:\` per
\`invoke\` e le chiamate a \`http://localhost:3001\`. Se il backend cambia porta o
host va aggiornata anche questa riga, altrimenti le chiamate vengono bloccate
dalla WebView.

## Cosa e' stato verificato

Su Windows 11, Node 24.19, cargo 1.99:

- \`node scripts/setup-tauri.mjs\` da un clone pulito di master, e una seconda
  volta di seguito (secondo giro: tutto saltato, nessuna patch duplicata).
- \`npm run build:desktop\` (\`tsc -b\` incluso) e \`npx oxlint\`: nessun errore nuovo.
- \`cargo check\` dentro \`src-tauri\`: pulito.
- \`npx tauri build --debug\`: binario + installer MSI e NSIS.
- Avvio dell'eseguibile \`target/debug/minicommerce.exe\`: la finestra si apre
  (titolo "minicommerce") e il bundle chiama davvero le API
  (\`GET /api/products\` con origine \`http://tauri.localhost\`), quindi router,
  percorsi degli asset e CSP sono a posto.
- \`npm run desktop:dev\` (\`tauri dev\`).

Non verificato a mano: il clic sul pulsante "Esporta catalogo" dentro la
finestra (dialogo nativo, scrittura del file e notifica) e il comportamento su
macOS e Linux.

## Problemi noti

- Il backend non viene avviato da Tauri: va lanciato a parte. Senza backend
  l'app apre la finestra e mostra gli errori di rete dei toast.
- \`npm install\` nel frontend segnala vulnerabilita' npm audit ereditate da
  master: non sono state toccate.
- Le icone nascono da \`src/assets/hero.png\`, che e' 343x361 e non quadrata:
  \`tauri icon --fit contain\` la centra su una tela trasparente e la ingrandisce,
  quindi l'icona e' sfocata. Per la produzione serve un PNG quadrato 1024x1024.
- La prima compilazione Rust e' lenta (diversi minuti) e scarica ~400 crate.
`

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------

function riepilogo() {
  console.log(`
=========================================================================
 minicommerce desktop (Tauri 2) pronto.

 Sviluppo, in due terminali:
   cd backend   && npm run dev          # API su http://localhost:3001
   cd frontend  && npm run desktop:dev  # Vite su :5173 + finestra Tauri

 Pacchetto:
   cd frontend && npm run desktop:build       # installer (release)
   cd frontend && npx tauri build --debug     # build di prova, piu' rapida

 Nota: la prima compilazione Rust richiede diversi minuti.
 Prova il ponte verso il sistema: login come admin -> Gestione catalogo ->
 "Esporta catalogo" (dialogo nativo in Tauri, download nel browser).

 Documentazione: docs/DESKTOP-TAURI.md
=========================================================================`)
}

try {
  console.log('minicommerce: setup desktop con Tauri 2')
  console.log(`radice del progetto: ${RADICE}`)
  passoPrerequisiti()
  passoInstallFrontend()
  passoPatchCondivise()
  passoAstrazionePiattaforma()
  passoDipendenzeTauri()
  passoScriptNpm()
  passoGuscioTauri()
  passoPluginTauri()
  passoConfigurazione()
  passoIcone()
  passoDocumentazione()
  passoVerifica()
  riepilogo()
} catch (errore) {
  console.error(`\nSETUP INTERROTTO: ${errore.message}`)
  if (!(errore instanceof ErroreSetup)) console.error(errore)
  process.exitCode = 1
}
