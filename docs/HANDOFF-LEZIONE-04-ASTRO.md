# Handoff: la lezione su Astro (modulo 4, seconda metà)

Promemoria operativo per tenere la lezione **da un computer diverso** da quello su
cui il ramo `web/astro` è stato costruito. Quattro ore: le slide della sottosezione
"Il blog con Astro", le due dimostrazioni dal vivo, il laboratorio 4b.

Questo file sta su `master`. I rami restano **master più un solo commit di merge**,
come dicono le slide, quindi dopo `git switch web/astro` non lo vedrete più: leggetelo
da `master`, o da GitHub.

Le slide (`modulo-04-vetrina-ssr.pdf`, 57 pagine) **non sono in questo repository**:
stanno nel progetto LaTeX del corso. Portatele a parte.

---

## 1. Prerequisiti sulla macchina nuova

- **Node 24 o superiore**: `node -v`. Il backend esegue TypeScript direttamente
  (`node --watch src/server.ts`), senza compilazione, e questo richiede Node recente.
  Il blog da solo si accontenta di Node 22.
- **Rete** la prima volta: tre `npm install` e, se volete servire `dist/`, un `npx serve`.
  Se l'aula ha una rete lenta, fate gli install **prima** della lezione.
- Niente altro: nessun Docker, nessun database da installare (SQLite sta in un file).

## 2. Setup da zero (15 minuti, da fare prima della lezione)

```bash
git clone https://github.com/TimesUp94/its2026_frontend_dev.git
cd its2026_frontend_dev
git switch web/astro
```

Tre terminali, tre cartelle. Il database non è nel repository (`*.db` è ignorato),
quindi la prima volta va creato e popolato:

```bash
# 1) backend -- porta 3001
cd backend
npm install
npm run db:push      # crea le tabelle SQLite
npm run db:seed      # 16 articoli, 7 categorie, l'utente admin
npm run dev

# 2) blog -- porta 4321
cd blog
npm install
npm run dev

# 3) negozio (la SPA) -- porta 5173, serve per cambiare un prezzo dall'admin
cd frontend
npm install
npm run dev
```

`blog/.env` **non serve** per la lezione: i valori predefiniti nel codice sono già
`localhost:3001` per l'API, `localhost:5173` per il negozio, `localhost:4321` per il
sito. Se dovete spostare una porta, `cp blog/.env.example blog/.env` e cambiate lì.

**Credenziali admin** (dal seed): `admin@minicommerce.dev` / `admin123`.

Verifica rapida che tutto sia in piedi:

```bash
curl -s http://localhost:3001/api/products | head -c 120   # il backend risponde
cd blog && npm run build                                    # 15 pagine, ~1,5 s
```

Se nel build compare un avviso e i prezzi spariscono dai post, il backend è spento:
`blog/src/lib/shop.ts` **avvisa e tira avanti** di proposito (scelta opposta a quella
della vetrina Next, ed è una delle cose da raccontare).

## 3. Le due dimostrazioni, con i comandi

### 3.1 Lo schema che ferma la build (30 secondi, alta resa)

In `blog/src/content/blog/portatile-per-studiare-informatica.md` accorciate la
`description` sotto i 50 caratteri (o scrivete `pubdate:` minuscolo), poi:

```bash
cd blog && npm run build
```

```
[InvalidContentEntryDataError] blog -> portatile-per-studiare-informatica
  data does not match collection schema.
  description: Too small: expected string to have >=50 characters
```

Il punto: una regola SEO è diventata un controllo che scatta sul computer di chi
scrive, non in produzione. Poi **ripristinate il file** (`git checkout -- blog/src/content/blog/`).

### 3.2 Il prezzo congelato e l'isola (il cuore della lezione)

Il post da usare è **"Un monitor 180 Hz serve davvero?"**
(`blog/src/content/blog/monitor-180hz-serve-davvero.md`, frontmatter `prodotti: [9, 3]`):
l'articolo 9 è il *Monitor UltraGear 27" QHD 180Hz*, il 3 è il *PC Desktop Gaming RTX 5070*.

1. Aprite il post sul blog: il prezzo in pagina è quello letto **durante la build**.
2. Dal negozio (`localhost:5173`, login admin) cambiate il prezzo del monitor.
3. Ricaricate il post **senza rifare la build**: l'isola dice che il prezzo è cambiato,
   con il vecchio sbarrato.
4. Disattivate JavaScript e ricaricate: resta il prezzo pubblicato, dichiarato come tale.
   L'isola **aggiunge**, non sostituisce.
5. Subito dopo, la slide delle direttive `client:*`, finché hanno in testa l'immagine.

Numeri verificati sul `dist/` costruito: **15 pagine HTML** (6 post, 7 archivi per tag,
home, 404), **1 solo `<script>` nella home** (ed è il JSON-LD), **3 in una pagina di post**
(il runtime delle isole e il componente del prezzo).

E, per chiudere, la pubblicazione senza Node:

```bash
cd blog && npm run build && npx serve dist
```

## 4. Su cosa insistere, in ordine

1. **"Si può usare Astro per minicommerce?"** — la risposta pezzo per pezzo, non sì/no.
   Guide e recensioni sì; catalogo filtrato no; schede prodotto "sa pregenerarle, ma non
   ha una risposta a *e quando cambia un prezzo?*"; carrello, login e admin no. Astro va a
   nozze con ciò che cambia **quando lo decide chi scrive**.
2. **Lo schema dei contenuti**, rotto dal vivo (§3.1). È la stessa idea della validazione
   zod del modulo 1, spostata un passo indietro: non "l'utente ha sbagliato", "l'autore ha sbagliato".
3. **`getStaticPaths`**: dice quali pagine devono esistere, e il risultato è una cartella
   di file. Da qui `npx serve dist`.
4. **Prezzo congelato + isola** (§3.2): è ciò che insegna il confine fra statico e dinamico
   meglio di qualunque spiegazione.
5. **La contabilità del JavaScript**: 1 script contro 3, e il confronto con la SPA del modulo 1.
6. **Feed, sitemap e robots**: file dentro `src/pages` che non finiscono in `.astro` sono rotte
   che restituiscono quello che vogliono. Nessun elenco scritto a mano.
7. **La tabella Astro o Next**, e la morale del repository: quattro rami, quattro strumenti,
   un backend solo.

Da **non** aprire: MDX, view transitions, server islands, `astro:assets` (quest'ultimo è
il punto 5 del laboratorio, che lo trovino loro).

## 5. Le quattro ore

| Quanto | Cosa |
|---|---|
| 45-55 min | Le 12 slide della sottosezione Astro, con le due dimostrazioni dentro |
| 1h30-2h | **Laboratorio 4b**: i passi stanno in `docs/WEB-ASTRO.md` §6, nell'ordine giusto |
| ~20 min | La sottosezione PHP/CMS/panorama: il "ma il negozio ha già un WordPress" |
| ~15 min | Le due slide sui rami, e le domande di verifica |

Dipendenza da sapere: la metà Astro si appoggia a quella Next in due punti (la risposta
"e quando cambia un prezzo?" è `revalidateTag`, e la tabella finale confronta i due). Se la
vetrina Next non è ancora stata spiegata, quella viene prima.

## 6. `singleton/`, se viene fuori il discorso

Sul ramo `web/nextjs` c'è anche `singleton/`: la stessa applicazione del modulo 1
(catalogo, login, carrello, admin) in un progetto Next solo, **senza API REST** --
i Server Component interrogano SQLite con Drizzle e le scritture sono Server Action.
Nelle slide sono tre pagine dentro la metà Next, e la slide *E Astro, tutto in uno?*
risponde alla stessa domanda per Astro.

Non serve per la lezione su Astro, ma se volete mostrarlo dal vivo ha un database suo
e gira sulla **porta 3000**, quindi non pesta i piedi a Express né a Vite:

```bash
git switch web/nextjs
cd singleton && npm install && npm run db:push && npm run db:seed && npm run dev
```

Il confronto che vale la pena fare ad alta voce: `singleton/` guadagna un processo
solo, i tipi scritti una volta e la sessione in un cookie `httpOnly`; perde l'API
pubblica, cioè esattamente ciò su cui vivono Electron, Capacitor e le app native dei
moduli 2, 3 e 5. Con `DATABASE_URL=../backend/minicommerce.db` le due versioni
lavorano sugli stessi dati.

## 7. Se finite presto

Il capitolo successivo è il **modulo 5, "App native"**: 37 pagine, e il suo laboratorio
richiede Android Studio, Xcode o .NET. Non si comincia nell'ultima mezz'ora.

Aprite **solo la prima sottosezione**, "Perché tornare al nativo": sette slide, nessuno
strumento da installare, e porta alla slide che conta davvero — *Cosa è cambiato nel 2026:
gli agenti di programmazione*, dove il costo della N-esima piattaforma crolla e resta il
costo di specificare e verificare. Fermatevi su *Cosa resta difficile (e vostro)* e chiudete
chiedendo di installare Android Studio per la volta dopo. Sono 40 minuti autosufficienti.

## 8. Cosa può andare storto

| Sintomo | Causa e rimedio |
|---|---|
| `EADDRINUSE` su 3001 | Un altro backend è già avviato: `lsof -i :3001`, poi `kill` |
| I prezzi non compaiono nei post | Backend spento **durante la build**: avviatelo e rifate `npm run build` |
| L'isola mostra "prezzo non disponibile" | Backend spento **adesso**: l'isola interroga l'API dal browser |
| `npm run dev` del backend esplode sui tipi | Node troppo vecchio: serve la 24 |
| La voce "Blog" nell'header del negozio non c'è | Siete su `master`: `git switch web/astro` |
| `npx serve` chiede di scaricare il pacchetto | Serve rete la prima volta; in alternativa `npm run preview` |

## 9. Dove sta scritto il resto

- `docs/WEB-ASTRO.md` — la guida del ramo: struttura, esperimenti in ordine, problemi noti.
- `scripts/setup-astro.mjs` — la trasformazione completa da `master`, idempotente, stampa
  ogni comando prima di eseguirlo (`--forza`, `--salta-install`, `--salta-build`).
- `docs/WEB-NEXTJS.md` — l'altra metà del modulo, per i rimandi.
- `README.md` — i comandi del progetto base.
