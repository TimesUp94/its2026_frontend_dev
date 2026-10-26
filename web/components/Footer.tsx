import Link from 'next/link'
import { getCategories, APP_URL } from '@/lib/api'
import { categoryPath } from '@/lib/seo'

/**
 * Il pie' di pagina sta nel layout, quindi compare in ogni pagina: l'elenco delle
 * categorie qui dentro e' un reticolo di link interni che fa trovare al crawler
 * tutte le pagine del sito partendo da una qualsiasi. Si chiama "internal linking"
 * ed e' uno degli interventi SEO con il miglior rapporto fra fatica e risultato.
 *
 * I dati arrivano da getCategories(), che e' "use cache": il pie' di pagina viene
 * generato una volta e riusato da tutte le pagine statiche.
 */
export async function Footer() {
  const categorie = await getCategories()

  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="font-semibold">minicommerce</p>
          <p className="text-sm text-muted-foreground">
            Il progetto del corso di Frontend Development dell&apos;ITS. Questa e&apos; la vetrina:
            sta su un server, si fa indicizzare e non ha bisogno di JavaScript per essere letta.
          </p>
        </div>
        <nav aria-label="Categorie" className="space-y-2">
          <p className="font-semibold">Categorie</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {categorie.map((categoria) => (
              <li key={categoria.id}>
                <Link className="hover:text-foreground hover:underline" href={categoryPath(categoria.name)}>
                  {categoria.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Collegamenti utili" className="space-y-2">
          <p className="font-semibold">Collegamenti</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link className="hover:text-foreground hover:underline" href="/chi-siamo">
                Chi siamo
              </Link>
            </li>
            <li>
              <a className="hover:text-foreground hover:underline" href="/sitemap.xml">
                sitemap.xml
              </a>
            </li>
            <li>
              <a className="hover:text-foreground hover:underline" href="/robots.txt">
                robots.txt
              </a>
            </li>
            <li>
              <a className="hover:text-foreground hover:underline" href={APP_URL}>
                Applicazione (SPA)
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
