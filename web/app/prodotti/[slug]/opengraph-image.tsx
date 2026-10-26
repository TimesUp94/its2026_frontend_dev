import { ImageResponse } from 'next/og'
import { getCatalog, getProduct } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { idFromSlug, productSlug } from '@/lib/slug'

/*
 * L'IMMAGINE DELL'ANTEPRIMA, generata una per articolo.
 *
 * Quando qualcuno incolla il link su WhatsApp, Telegram o LinkedIn, l'anteprima e'
 * questa: 1200x630 pixel disegnati da noi con nome, categoria e prezzo. Il file si
 * chiama opengraph-image e sta nella cartella della pagina: Next aggiunge da solo
 * i tag <meta property="og:image"> con l'indirizzo giusto e le dimensioni.
 *
 * Dentro ImageResponse non c'e' un browser: c'e' satori, che sa disegnare flexbox e
 * testo e nient'altro. Quindi stili inline, niente Tailwind, niente classi.
 */

export const alt = 'Scheda prodotto di minicommerce'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Anche le immagini si pregenerano: una per ogni articolo del catalogo. */
export async function generateStaticParams() {
  const prodotti = await getCatalog()
  return prodotti.map((prodotto) => ({ slug: productSlug(prodotto) }))
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = idFromSlug(slug)
  const prodotto = id === null ? null : await getProduct(id)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          backgroundColor: '#0a0a0a',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, opacity: 0.7 }}>
          minicommerce
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 28, opacity: 0.7 }}>
            {prodotto ? prodotto.category : 'Catalogo'}
          </div>
          <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.1, fontWeight: 700 }}>
            {prodotto ? prodotto.name : 'Articolo non trovato'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderTop: '2px solid #333',
            paddingTop: 32,
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.7 }}>
            {prodotto?.brand ? prodotto.brand : 'informatica e accessori'}
          </div>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 700 }}>
            {prodotto ? formatPrice(prodotto.price) : ''}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
