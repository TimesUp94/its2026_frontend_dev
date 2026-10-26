import Link from 'next/link'

/**
 * La pagina 404.
 *
 * Non e' un dettaglio estetico: questa risposta porta davvero lo stato HTTP 404, e
 * un motore di ricerca che lo riceve toglie l'indirizzo dall'indice invece di tenere
 * in giro un link morto. Nella SPA, invece, qualunque indirizzo sbagliato risponde
 * 200 con la pagina vuota: per un crawler sono tutte pagine valide e identiche.
 *
 * Una finezza da sapere, e da provare con curl -I (vedi docs/WEB-NEXTJS.md): per un
 * indirizzo mai visto prima Next spedisce subito il guscio statico - e il guscio
 * parte con 200 - poi completa la pagina in streaming. Il 404 vero arriva dalla
 * seconda richiesta in poi, quando l'esito e' in cache. Nel frattempo la pagina
 * dichiara comunque noindex, quindi nell'indice non ci finisce.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">Errore 404</p>
      <h1 className="text-3xl font-bold tracking-tight">Questa pagina non esiste</h1>
      <p className="text-muted-foreground">
        L&apos;articolo potrebbe essere stato rimosso dal catalogo, oppure l&apos;indirizzo
        contiene un errore di battitura.
      </p>
      <div className="flex gap-2 pt-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Torna al catalogo
        </Link>
        <Link
          href="/categorie"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent"
        >
          Sfoglia le categorie
        </Link>
      </div>
    </main>
  )
}
