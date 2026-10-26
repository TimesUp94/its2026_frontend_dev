# web/ - la vetrina di minicommerce (Next.js)

Questa cartella contiene il **sito pubblico** di minicommerce: le stesse informazioni
del catalogo, ma generate sul server e scritte nell'HTML prima che arrivi il
visitatore, in modo che un motore di ricerca le possa leggere.

Non e' una seconda versione dell'applicazione: login, carrello e area di
amministrazione restano nella SPA React dentro `frontend/`. Qui si guarda, la' si fa.

| | `frontend/` (SPA) | `web/` (vetrina) |
|---|---|---|
| Chi la usa | chi ha gia' deciso di comprare | chi deve ancora trovarvi |
| Dove gira | tutto nel browser | per la maggior parte sul server |
| HTML iniziale | un `<div id="root">` vuoto | la pagina completa |
| Dati | `axios` + token in `localStorage` | `fetch` sul server, senza token |
| Rotte | `react-router-dom` | cartelle dentro `app/` |

## Avvio rapido

```bash
cd backend && npm run dev      # l'API su :3001, serve anche a questo sito
cd web     && npm run dev      # il sito su :3000
```

Tutto il resto - prerequisiti, esperimenti da fare a lezione, come si aggiorna una
pagina statica quando cambia un prezzo, problemi noti - sta in
[`docs/WEB-NEXTJS.md`](../docs/WEB-NEXTJS.md).
