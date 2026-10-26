import Image from 'next/image'
import { Package } from 'lucide-react'

/**
 * next/image non e' solo un <img>: ridimensiona, converte in formati moderni,
 * impone width e height (quindi niente salti di layout) e carica in differita.
 * In cambio pretende di sapere da quali host puo' scaricare: vedi remotePatterns
 * in next.config.ts.
 *
 * Nel nostro seed imageUrl e' sempre null, quindi il caso "nessuna immagine" non e'
 * un dettaglio: e' il caso normale, e va disegnato bene.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string | null
  alt: string
  sizes: string
  priority?: boolean
}) {
  if (!src) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Package className="size-10 stroke-1" aria-hidden="true" />
        <span className="text-xs">Immagine non disponibile</span>
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-contain p-4"
    />
  )
}
