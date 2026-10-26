#!/usr/bin/env node
// -----------------------------------------------------------------------------
// confronto-seo.mjs
//
// Mette una accanto all'altra la stessa scheda prodotto vista da un crawler:
// una volta nella SPA (Vite) e una volta nella vetrina (Next).
//
// Non misura la bellezza e non misura la velocita': misura cosa c'e' SCRITTO
// nell'HTML che il server ha spedito, prima che il browser esegua JavaScript.
// E' esattamente quello che legge Googlebot al primo passaggio.
//
// Uso:
//   node scripts/confronto-seo.mjs
//   node scripts/confronto-seo.mjs --id 3
//   node scripts/confronto-seo.mjs --spa http://localhost:5173 --vetrina http://localhost:3000
//
// Prerequisiti: backend avviato, e almeno uno dei due frontend in ascolto.
// -----------------------------------------------------------------------------

import process from 'node:process'

function argomento(nome, predefinito) {
  const indice = process.argv.indexOf(`--${nome}`)
  return indice !== -1 && process.argv[indice + 1] ? process.argv[indice + 1] : predefinito
}

const API = argomento('api', 'http://localhost:3001/api').replace(/\/+$/, '')
const SPA = argomento('spa', 'http://localhost:5173').replace(/\/+$/, '')
const VETRINA = argomento('vetrina', 'http://localhost:3000').replace(/\/+$/, '')
const ID = Number(argomento('id', '1'))

/** La stessa funzione di web/lib/slug.ts: qui la ripetiamo per non dipendere da nulla. */
function slugify(testo) {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function scarica(indirizzo) {
  const inizio = Date.now()
  try {
    const risposta = await fetch(indirizzo, { headers: { Accept: 'text/html' } })
    const html = await risposta.text()
    return { ok: true, stato: risposta.status, html, ms: Date.now() - inizio }
  } catch (errore) {
    return { ok: false, errore: errore.message, html: '', ms: Date.now() - inizio }
  }
}

/** Via script, style e tag: resta il testo che un lettore (o un crawler) vede. */
function soloTesto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function primoGruppo(html, espressione) {
  const trovato = espressione.exec(html)
  return trovato ? trovato[1].trim() : null
}

function analizza(html) {
  return {
    titolo: primoGruppo(html, /<title[^>]*>([^<]*)<\/title>/i),
    descrizione: primoGruppo(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    canonical: primoGruppo(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
    h1: primoGruppo(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, '').trim() ?? null,
    jsonLd: (html.match(/<script[^>]+application\/ld\+json/gi) ?? []).length,
    link: (html.match(/<a\s[^>]*href=/gi) ?? []).length,
    parole: soloTesto(html).split(' ').filter(Boolean).length,
    byte: Buffer.byteLength(html, 'utf8'),
  }
}

function riga(etichetta, sinistra, destra) {
  const testo = (valore) => {
    if (valore === null || valore === undefined) return '-'
    const stringa = String(valore)
    return stringa.length > 46 ? `${stringa.slice(0, 43)}...` : stringa
  }
  console.log(`${etichetta.padEnd(16)} | ${testo(sinistra).padEnd(46)} | ${testo(destra)}`)
}

// --------------------------------------------------------------------------- //

const risposta = await fetch(`${API}/products/${ID}`).catch(() => null)
if (!risposta || !risposta.ok) {
  console.error(`\nNon riesco a leggere ${API}/products/${ID}.`)
  console.error('Il backend e\' avviato?  cd backend && npm run dev\n')
  process.exit(1)
}
const prodotto = await risposta.json()
const slug = `${prodotto.id}-${slugify(prodotto.name)}`

const indirizzoSpa = `${SPA}/article/${prodotto.id}`
const indirizzoVetrina = `${VETRINA}/prodotti/${slug}`

console.log(`\nArticolo ${prodotto.id}: ${prodotto.name}`)
console.log(`SPA      ${indirizzoSpa}`)
console.log(`Vetrina  ${indirizzoVetrina}\n`)

const [spa, vetrina] = await Promise.all([scarica(indirizzoSpa), scarica(indirizzoVetrina)])

for (const [nome, esito] of [
  ['SPA', spa],
  ['vetrina', vetrina],
]) {
  if (!esito.ok) console.log(`! ${nome} non risponde: ${esito.errore}`)
}

const a = analizza(spa.html)
const b = analizza(vetrina.html)

console.log('-'.repeat(100))
riga('', 'SPA (Vite)', 'Vetrina (Next)')
console.log('-'.repeat(100))
riga('stato', spa.stato, vetrina.stato)
riga('tempo', `${spa.ms} ms`, `${vetrina.ms} ms`)
riga('byte di HTML', a.byte, b.byte)
riga('<title>', a.titolo, b.titolo)
riga('description', a.descrizione, b.descrizione)
riga('canonical', a.canonical, b.canonical)
riga('<h1>', a.h1, b.h1)
riga('blocchi JSON-LD', a.jsonLd, b.jsonLd)
riga('link <a href>', a.link, b.link)
riga('parole di testo', a.parole, b.parole)
riga(
  'nome articolo',
  spa.html.includes(prodotto.name) ? 'presente' : 'ASSENTE',
  vetrina.html.includes(prodotto.name) ? 'presente' : 'ASSENTE',
)
riga(
  'prezzo',
  spa.html.includes(String(prodotto.price)) ? 'presente' : 'ASSENTE',
  vetrina.html.includes(prodotto.price.toFixed(2)) || vetrina.html.includes(String(prodotto.price))
    ? 'presente'
    : 'ASSENTE',
)
console.log('-'.repeat(100))
console.log(
  '\nLa SPA non sta sbagliando niente: fa il suo mestiere, che e\' far USARE' +
    "\nl'applicazione. Solo che il contenuto arriva dopo, in JavaScript, e in questo" +
    '\nHTML non c\'e\'. La vetrina fa il mestiere opposto: farsi LEGGERE.\n',
)
