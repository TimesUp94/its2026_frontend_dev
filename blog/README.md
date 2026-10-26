# blog/ - il blog di minicommerce (Astro)

Il modulo di contenuti del progetto: guide all'acquisto scritte in Markdown e
trasformate in file HTML una volta sola, al momento della pubblicazione.

Non e' un pezzo del negozio e non ne dipende: `astro build` produce una cartella
`dist/` di file statici che si pubblica anche su un hosting che non sa cosa sia
Node. L'unico filo che lo lega al catalogo e' il campo `prodotti` nel frontmatter
dei post, con cui ogni articolo cita gli articoli del negozio di cui parla.

| | `frontend/` (SPA) | `blog/` (Astro) |
|---|---|---|
| Cosa contiene | funzioni | contenuti |
| JavaScript nella pagina | tutta l'applicazione | zero, tranne un'isola |
| Dove vivono i dati | nel database, via API | in file Markdown nel repository |
| Quando si costruisce la pagina | nel browser, a ogni visita | una volta, in fase di build |
| Chi la aggiorna | l'amministratore, dall'app | chi scrive, con una pull request |

## Avvio rapido

```bash
cd blog && npm run dev            # il blog su :4321
cd backend && npm run dev         # opzionale: serve solo per i prezzi nei post
```

```bash
npm run build && npm run preview  # le pagine statiche vere, come in produzione
```

## La mappa

```
src/
  content.config.ts        la forma del frontmatter: un errore ferma la build
  content/blog/*.md        i sei articoli
  layouts/BaseLayout.astro testa della pagina, metadati, JSON-LD
  components/
    PrezzoLive.tsx         l'unica isola React del sito: il prezzo dal vivo
    ProductCard.astro      la scheda di un articolo del catalogo
  lib/shop.ts              legge il catalogo dall'API, solo in fase di build
  pages/
    index.astro            l'elenco degli articoli
    blog/[...slug].astro   una pagina per post
    tag/[tag].astro        una pagina per argomento
    rss.xml.ts             il feed
    robots.txt.ts          robots.txt generato con l'indirizzo giusto
```

Tutto il resto - prerequisiti, esperimenti da fare a lezione, quando conviene Astro
e quando conviene Next - sta in [`docs/WEB-ASTRO.md`](../docs/WEB-ASTRO.md).
