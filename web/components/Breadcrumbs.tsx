import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StructuredData } from '@/components/StructuredData'
import { breadcrumbJsonLd } from '@/lib/seo'

/**
 * Le briciole di pane servono due volte: all'utente, che capisce dove si trova, e
 * al motore di ricerca, che nel risultato mostra "minicommerce > Monitor > ..."
 * invece dell'URL. Per questo insieme alla lista disegnata stampiamo anche il
 * JSON-LD BreadcrumbList: stessa informazione, due pubblici.
 */
export function Breadcrumbs({ voci }: { voci: Array<{ nome: string; percorso: string }> }) {
  return (
    <>
      <StructuredData data={breadcrumbJsonLd(voci)} />
      <nav aria-label="Percorso di navigazione">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {voci.map((voce, indice) => {
            const ultima = indice === voci.length - 1
            return (
              <li key={voce.percorso} className="flex items-center gap-1">
                {ultima ? (
                  <span aria-current="page" className="text-foreground">
                    {voce.nome}
                  </span>
                ) : (
                  <>
                    <Link href={voce.percorso} className="hover:text-foreground hover:underline">
                      {voce.nome}
                    </Link>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
