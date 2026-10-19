// Avvio in sviluppo: compila il guscio, accende il dev server di Vite, ASPETTA che
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
const URL_DEV = process.env.VITE_DEV_SERVER_URL ?? `http://${HOST}:${PORTA}`
const SHELL = process.platform === 'win32'
const NPM = SHELL ? 'npm.cmd' : 'npm'

function esegui(comando) {
  console.log(`> ${comando}`)
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

const compilazione = esegui(`${NPM} run build`)
if (compilazione !== 0) process.exit(compilazione)

const argomentiVite = ['run', 'dev:desktop', '--', '--host', HOST, '--port', PORTA]
console.log(`> ${NPM} ${argomentiVite.join(' ')}   (in ${FRONTEND})`)
const vite = spawn(`${NPM} ${argomentiVite.join(' ')}`, { cwd: FRONTEND, stdio: 'inherit', shell: true })

console.log(`      attendo ${URL_DEV} ...`)
if (!(await aspettaServer(URL_DEV))) {
  console.error(`
Il dev server di minicommerce non risponde su ${URL_DEV}.
Se la porta e' occupata da un altro progetto:  VITE_PORT=5180 npm run dev`)
  termina(vite)
  process.exit(1)
}

const electron = createRequire(import.meta.url)('electron')
console.log(`> electron .   (VITE_DEV_SERVER_URL=${URL_DEV})`)
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
